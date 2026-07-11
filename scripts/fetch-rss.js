#!/usr/bin/env node
/**
 * TDAH Perplex — RSS Pipeline (production)
 *
 * Pure Node.js, zero npm dependencies.
 * Reads data/rss-sources.json, fetches each RSS feed,
 * deduplicates, enriches with geo-metadata,
 * and writes data/carto-feed.json.
 *
 * Run:  node scripts/fetch-rss.js
 * CI:   node scripts/fetch-rss.js --ci   (non-zero exit on any error)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Paths ──
const SOURCES_FILE = path.join(__dirname, '..', 'data', 'rss-sources.json');
const OUTPUT_FILE   = path.join(__dirname, '..', 'data', 'carto-feed.json');
const MAX_ARTICLES  = 200;
const REQUEST_TIMEOUT = 15000; // 15 s
const RETRIES = 1;

// ── Helpers ──

/** Generic HTTP(S) GET returning body text. */
function httpGet(url, timeout = REQUEST_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout }, (res) => {
      // Follow one redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return httpGet(res.headers.location, timeout).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

/** Strip HTML tags. */
function stripTags(str) {
  return str.replace(/<[^>]*>/g, '');
}

/** Decode XML/HTML entities. */
function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#(?:x([\da-fA-F]+)|(\d+));/g, (_, hex, dec) =>
      String.fromCharCode(parseInt(hex || dec, hex ? 16 : 10))
    )
    .replace(/&hellip;/g, '…')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"');
}

/** Parse RSS/XML feed -> array of raw article objects. */
function parseRSS(xml) {
  const articles = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    const extract = (tag) => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const m = item.match(re);
      return m ? m[1].trim() : '';
    };

    const title = extract('title');
    const link   = extract('link').replace(/&amp;/g, '&');
    let description = extract('description');
    if (!description) description = extract('content:encoded');

    // Clean description
    description = description
      .replace(/<[^>]*>/g, '')     // strip HTML tags
      .replace(/\s+/g, ' ')        // collapse whitespace
      .trim()
      .substring(0, 500);

    // Parse date (pubDate or dc:date or atom:updated)
    let pubDate = extract('pubDate') || extract('dc:date') || extract('updated');
    let timestamp = 0;
    if (pubDate) {
      const d = new Date(pubDate);
      if (!isNaN(d.getTime())) timestamp = d.getTime();
    }

    // Extract domain from link
    let domain = '';
    try {
      domain = new URL(link).hostname.replace(/^www\./, '');
    } catch (_) { /* ignore */ }

    // Canonical URL (try <guid> which may be the permalink)
    let canonical = link;
    const guid = extract('guid');
    if (guid) {
      try {
        const u = new URL(guid);
        canonical = u.href;
      } catch (_) { /* guid might be non-URL */ }
    }

    if (title && link && !title.toLowerCase().includes('adhd directory')) {
      articles.push({ title, link, description, timestamp, domain, canonical, guid });
    }
  }

  // Also handle Atom feed format
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const extract = (tag) => {
      // Atom uses <tag>text</tag> or <tag type="html">text</tag>
      const re = new RegExp(`<${tag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const m = entry.match(re);
      return m ? m[1].trim() : '';
    };

    const title = extract('title');
    const linkMatch = entry.match(/<link[^>]*href="([^"]+)"/);
    const link = linkMatch ? linkMatch[1].replace(/&amp;/g, '&') : '';
    let description = extract('summary') || extract('content');
    description = description
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500);

    let pubDate = extract('published') || extract('updated');
    let timestamp = 0;
    if (pubDate) {
      const d = new Date(pubDate);
      if (!isNaN(d.getTime())) timestamp = d.getTime();
    }

    let domain = '';
    try { domain = new URL(link).hostname.replace(/^www\./, ''); } catch (_) {}

    const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/i);
    const canonical = idMatch ? idMatch[1].trim() : link;

    if (title && link) {
      articles.push({ title, link, description, timestamp, domain, canonical, guid: '' });
    }
  }

  return articles;
}

/** Normalize string for dedup key. */
function dedupKey(title, sourceId, date) {
  const s = (title + '|' + sourceId + '|' + date).toLowerCase().replace(/[^a-z0-9|]/g, '');
  return s.substring(0, 120);
}

function dedupKeyFromUrl(url) {
  try {
    const u = new URL(url);
    // Use pathname + query (sorted) as stable key
    const params = new URLSearchParams(u.search);
    const sortedParams = [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))
      .map(e => e.join('=')).join('&');
    return (u.pathname + '?' + sortedParams).replace(/^\/+/, '');
  } catch (_) {
    return url;
  }
}

// ── Main ──
async function main() {
  const isCI = process.argv.includes('--ci');
  const errors = [];

  // 1. Read sources
  let sources;
  try {
    sources = JSON.parse(fs.readFileSync(SOURCES_FILE, 'utf-8'));
  } catch (err) {
    console.error('❌ Cannot read sources:', err.message);
    process.exit(1);
  }

  const activeSources = sources.filter(s => s.active !== false);
  console.log(`📡 TDAH Perplex — RSS Pipeline`);
  console.log(`   Sources: ${activeSources.length} active out of ${sources.length} total\n`);

  // 2. Fetch each feed
  const allArticles = [];
  const seenUrls = new Set();       // dedup by canonical URL
  const seenHashes = new Set();     // dedup by hash(title+sourceId+date)

  for (const src of activeSources) {
    let xml = null;
    let lastErr = null;

    // Attempt with retry
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      try {
        if (attempt > 0) console.log(`   ↻ Retry ${attempt}/${RETRIES} — ${src.name} (${src.id})`);
        xml = await httpGet(src.url);
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < RETRIES) {
          // Brief pause before retry
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }

    if (!xml) {
      const msg = `${src.name} (${src.id}): ${lastErr ? lastErr.message : 'unknown error'}`;
      errors.push(msg);
      console.log(`   ✗ ${msg}`);
      continue;
    }

    // Parse
    const items = parseRSS(xml);
    console.log(`   → ${src.name} (${src.id}): ${items.length} articles parsed`);

    let added = 0;
    for (const item of items) {
      // Dedup by canonical URL
      const urlKey = dedupKeyFromUrl(item.canonical || item.link);
      if (seenUrls.has(urlKey)) continue;

      // Dedup by hash of title+sourceId+date
      const dateStr = item.timestamp ? new Date(item.timestamp).toISOString().substring(0, 10) : 'nodate';
      const hashKey = dedupKey(item.title, src.id, dateStr);
      if (seenHashes.has(hashKey)) continue;

      seenUrls.add(urlKey);
      seenHashes.add(hashKey);

      const decodedTitle = decodeEntities(stripTags(item.title)).trim().substring(0, 300);
      const decodedDesc  = decodeEntities(item.description).trim().substring(0, 500);

      allArticles.push({
        title: decodedTitle || '(no title)',
        link: item.link,
        description: decodedDesc || null,
        source: src.name,
        sourceId: src.id,
        lang: src.lang || 'EN',
        country: src.country || '',
        lat: src.lat || 0,
        lng: src.lng || 0,
        category: src.category || 'news',
        date: item.timestamp ? new Date(item.timestamp).toISOString() : null,
        domain: item.domain || null,
      });
      added++;
    }
    console.log(`   ✓ ${added} new unique articles retained`);
  }

  // 3. Sort by date descending (newest first)
  allArticles.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // 4. Limit to MAX_ARTICLES
  const selected = allArticles.slice(0, MAX_ARTICLES);

  // 5. Enumerate IDs
  const articles = selected.map((a, i) => ({ id: i + 1, ...a }));

  // 6. Build output
  const output = {
    fetchedAt: new Date().toISOString(),
    totalSources: activeSources.length,
    sourceErrors: errors.length,
    errors: errors.length > 0 ? errors : undefined,
    articles,
  };

  // 7. Write output — fallback strategy
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ ${OUTPUT_FILE} written — ${articles.length}/${allArticles.length} articles (capped at ${MAX_ARTICLES})`);

  // Save backup whenever we have at least some articles (partial or full success)
  if (articles.length > 0) {
    fs.copyFileSync(OUTPUT_FILE, OUTPUT_FILE + '.bak');
    console.log('💾 Backup saved');
  }

  if (errors.length > 0) {
    console.log(`⚠  ${errors.length} source error(s):`);
    errors.forEach(e => console.log(`    • ${e}`));

    // Fallback: if no articles were fetched at all, restore previous valid file from backup
    if (articles.length === 0) {
      const backupFile = OUTPUT_FILE + '.bak';
      if (fs.existsSync(backupFile)) {
        fs.copyFileSync(backupFile, OUTPUT_FILE);
        console.log('⚠  No articles fetched — restored previous valid carto-feed.json from backup');
      } else {
        console.error('❌ No articles fetched and no backup available — carto-feed.json is empty');
        if (isCI) process.exit(1);
      }
    }

    if (isCI) process.exit(1);
  }

  console.log('🏁 Done');
}

// ── Journalise errors to data/errors.log ──
const originalConsoleError = console.error;
console.error = function (...args) {
  const msg = args.map(a => (a instanceof Error ? a.stack : String(a))).join(' ');
  try {
    const logPath = path.join(__dirname, '..', 'data', 'errors.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`, 'utf-8');
  } catch (_) { /* ignore log errors */ }
  originalConsoleError.apply(console, args);
};

main().catch(err => {
  console.error('❌ Fatal:', err.stack || err.message);
  process.exit(1);
});
