#!/usr/bin/env node
/**
 * TDAH Profile — RSS News Fetcher
 * Fetches from multiple ADHD/TDAH news sources, deduplicates, saves news.json
 * Runs in GitHub Actions (pure Node.js, zero npm deps)
 *
 * Source RSS:
 *   EN — ADDitude Magazine, CHADD, Google News ADHD, Google News ADHD Research
 *   FR — TDAH France (HyperSupers), Google News TDAH France
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ── Config ──
const NEWS_FILE = path.join(__dirname, '..', 'news.json');
const MAX_ARTICLES = 30; // total in output
const MAX_PER_FEED = 12; // max per source

const FEEDS = [
  // English — primary ADHD sources
  { url: 'https://www.additudemag.com/feed/', label: 'ADDitude Magazine', lang: 'EN', icon: '📰' },
  { url: 'https://chadd.org/feed/', label: 'CHADD', lang: 'EN', icon: '🏛️' },
  { url: 'https://news.google.com/rss/search?q=ADHD&hl=en-US&gl=US&ceid=US:en', label: 'Google News — ADHD', lang: 'EN', icon: '🔍' },
  { url: 'https://news.google.com/rss/search?q=ADHD+research&hl=en-US&gl=US&ceid=US:en', label: 'Google News — ADHD Research', lang: 'EN', icon: '🔬' },

  // French — TDAH sources
  { url: 'https://www.tdah-france.fr/spip.php?page=backend', label: 'TDAH France (HyperSupers)', lang: 'FR', icon: '🇫🇷' },
  { url: 'https://news.google.com/rss/search?q=TDAH&hl=fr&gl=FR&ceid=FR:fr', label: 'Google News — TDAH', lang: 'FR', icon: '🇫🇷' },
];

// ── Helpers ──
function fetchXML(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      // Follow redirects manually once
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchXML(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseRSS(xml) {
  const articles = [];
  // Extract <item> blocks
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const extract = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1].trim() : '';
    };

    const title = extract('title');
    const link = extract('link').replace(/&amp;/g, '&');
    const description = extract('description')
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(d))
      .trim()
      .substring(0, 300);

    // Parse date
    let pubDate = extract('pubDate') || extract('dc:date');
    let timestamp = 0;
    if (pubDate) {
      const d = new Date(pubDate);
      if (!isNaN(d.getTime())) timestamp = d.getTime();
    }

    // Source hint from URL
    let sourceDomain = '';
    try {
      const u = new URL(link);
      sourceDomain = u.hostname.replace('www.', '');
    } catch(e) {}

    if (title && link && !title.includes('ADHD directory')) {
      articles.push({ title: decodeEntities(title), link, description: decodeEntities(description), timestamp, sourceDomain });
    }
  }

  return articles;
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(d));
}

function isDuplicate(a, b) {
  // Simple dedup: similar titles
  const normalize = s => s.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
  return normalize(a.title) === normalize(b.title);
}

// ── Main ──
async function main() {
  console.log(`📡 Fetching ${FEEDS.length} RSS feeds...\n`);

  const allArticles = [];
  const errors = [];
  const seen = new Set();

  for (const feed of FEEDS) {
    try {
      console.log(`  → ${feed.label} (${feed.url})`);
      const xml = await fetchXML(feed.url);
      const items = parseRSS(xml);
      console.log(`    ✓ ${items.length} articles`);

      // Filter through Google News (they have heavy cross-posting)
      let added = 0;
      for (const item of items) {
        if (!item.title) continue;
        const key = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
        if (seen.has(key)) continue;
        seen.add(key);

        allArticles.push({
          ...item,
          source: feed.label,
          lang: feed.lang,
          icon: feed.icon,
        });
        added++;
        if (added >= MAX_PER_FEED) break;
      }
      console.log(`    → ${added} new unique articles retained`);
    } catch (err) {
      errors.push(`${feed.label}: ${err.message}`);
      console.log(`    ✗ Error: ${err.message}`);
    }
  }

  // Sort by date (newest first), fallback to link stability
  allArticles.sort((a, b) => b.timestamp - a.timestamp);

  // Limit total
  const selected = allArticles.slice(0, MAX_ARTICLES);

  // Build output
  const output = {
    fetchedAt: new Date().toISOString(),
    totalSources: FEEDS.length,
    sourceErrors: errors.length,
    errors: errors.length > 0 ? errors : undefined,
    articles: selected.map((a, i) => ({
      id: i + 1,
      title: a.title,
      link: a.link,
      description: a.description || null,
      source: a.source,
      lang: a.lang || 'EN',
      icon: a.icon || '📋',
      date: a.timestamp ? new Date(a.timestamp).toISOString() : null,
      domain: a.sourceDomain || null,
    })),
  };

  fs.writeFileSync(NEWS_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ ${NEWS_FILE} written — ${selected.length} articles`);
  if (errors.length > 0) console.log(`⚠ ${errors.length} source error(s):\n    ${errors.join('\n    ')}`);
}

main().catch(err => {
  console.error('❌ Fatal:', err.message);
  process.exit(1);
});
