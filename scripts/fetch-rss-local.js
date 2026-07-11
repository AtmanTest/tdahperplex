#!/usr/bin/env node
/**
 * TDAH Perplex — RSS Pipeline LOCAL (demo/test mode)
 *
 * Pure Node.js, zero npm dependencies.
 * Reads data/rss-demo.json (mock articles) instead of fetching real RSS feeds.
 * Outputs data/carto-feed.json in the same format as fetch-rss.js.
 *
 * Use this for CI/testing/offline demos.
 *
 * Run:  node scripts/fetch-rss-local.js
 */

const fs = require('fs');
const path = require('path');

// ── Paths ──
const DEMO_FILE   = path.join(__dirname, '..', 'data', 'rss-demo.json');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'carto-feed.json');
const MAX_ARTICLES = 200;

// ── Main ──
function main() {
  console.log('📡 TDAH Perplex — RSS Pipeline (Local Demo Mode)');

  // 1. Read demo data
  let demoData;
  try {
    demoData = JSON.parse(fs.readFileSync(DEMO_FILE, 'utf-8'));
  } catch (err) {
    console.error('❌ Cannot read rss-demo.json:', err.message);
    process.exit(1);
  }

  const demoArticles = demoData.articles || [];
  console.log(`   Source: ${DEMO_FILE}`);
  console.log(`   Demo articles available: ${demoArticles.length}`);

  // 2. Transform demo articles into carto-feed.json format
  const articles = demoArticles
    .slice(0, MAX_ARTICLES)
    .map((a, i) => ({
      id: i + 1,
      title: a.title,
      link: a.url,
      description: a.summary || null,
      source: a.source_name,
      sourceId: a.source_id,
      lang: a.lang || 'EN',
      country: a.source_country || '',
      lat: a.source_lat || 0,
      lng: a.source_lng || 0,
      category: a.category || 'news',
      date: a.published ? new Date(a.published).toISOString() : null,
      domain: a.url ? extractDomain(a.url) : null,
    }));

  // 3. Sort by date descending
  articles.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Re-assign sequential IDs after sort
  articles.forEach((a, i) => { a.id = i + 1; });

  // 4. Build output
  const output = {
    fetchedAt: new Date().toISOString(),
    totalSources: articles.reduce((acc, a) => { acc.add(a.sourceId); return acc; }, new Set()).size,
    sourceErrors: 0,
    articles,
  };

  // 5. Write output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ ${OUTPUT_FILE} written — ${articles.length} articles (local demo mode)`);
  console.log('🏁 Done');
}

/** Extract domain from a URL string. */
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_) {
    return null;
  }
}

main();
