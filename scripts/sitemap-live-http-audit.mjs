#!/usr/bin/env node
/**
 * Sitemap Live HTTP Audit
 * ───────────────────────
 * Fetches the live sitemap index + all sub-sitemaps from the edge function,
 * extracts every <loc> URL, and requests each one to verify:
 *   1. No HTTP 404 or 5xx response
 *   2. No redirect to /admin or /dashboard
 *
 * Usage:
 *   node scripts/sitemap-live-http-audit.mjs [--base https://qitaat.com] [--concurrency 10] [--timeout 10000]
 *
 * Exit codes: 0 = pass, 1 = failures found
 */

import fs from "node:fs";

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = flag("base", "https://qitaat.com").replace(/\/$/, "");
// The sitemap edge function may be proxied through the main domain or served
// directly from Supabase. We allow overriding via --sitemap-url.
const SITEMAP_INDEX = flag("sitemap-url", `${BASE}/functions/v1/sitemap`);
const CONCURRENCY = parseInt(flag("concurrency", "10"), 10);
const TIMEOUT_MS = parseInt(flag("timeout", "10000"), 10);

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};

/* ── helpers ── */

function extractLocs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function safeFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: "manual", signal: controller.signal });
    const body = await res.text();
    return { status: res.status, location: res.headers.get("location"), body, error: null };
  } catch (err) {
    return { status: 0, location: null, body: "", error: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/* ── 1. Fetch sitemap index ── */

console.log(`\n${c.bold}${c.cyan}🌐 Sitemap Live HTTP Audit${c.reset}`);
console.log(`   Base: ${BASE}`);
console.log(`   Sitemap index: ${SITEMAP_INDEX}`);
console.log(`   Concurrency: ${CONCURRENCY}\n`);

const indexRes = await safeFetch(SITEMAP_INDEX);
if (indexRes.status !== 200 || !indexRes.body.includes("<loc>")) {
  // Fallback: try the static sitemap.xml at the base domain
  console.log(`   ${c.yellow}⚠${c.reset} Primary sitemap returned ${indexRes.status}, trying ${BASE}/sitemap.xml...`);
  const fallbackRes = await safeFetch(`${BASE}/sitemap.xml`);
  if (fallbackRes.status !== 200 || !fallbackRes.body.includes("<loc>")) {
    console.error(`${c.red}✗ Failed to fetch sitemap: both endpoints returned non-XML${c.reset}`);
    process.exit(1);
  }
  indexRes.body = fallbackRes.body;
  indexRes.status = fallbackRes.status;
}

// The sitemap index may reference edge function URLs like
// https://qitaat.com/functions/v1/sitemap?type=X — but that domain
// might serve the SPA instead. Detect and rewrite to use Supabase URL.
const subSitemapUrls = extractLocs(indexRes.body);

// Resolve sub-sitemap URLs: if they fail (return HTML), try via SUPABASE_URL
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";

async function fetchSubSitemap(url) {
  const res = await safeFetch(url);
  if (res.status === 200 && res.body.includes("<url>")) return res;

  // Rewrite: qitaat.com/functions/v1/sitemap → supabase-url/functions/v1/sitemap
  if (SUPABASE_URL) {
    const rewritten = url.replace(/^https?:\/\/[^/]+\/functions\/v1\//, `${SUPABASE_URL}/functions/v1/`);
    if (rewritten !== url) {
      const res2 = await safeFetch(rewritten);
      if (res2.status === 200 && res2.body.includes("<url>")) return res2;
    }
  }
  return res; // return original (may be HTML)
}

console.log(`   Sub-sitemaps found: ${subSitemapUrls.length}`);

/* ── 2. Fetch all sub-sitemaps and collect URLs ── */

const allUrls = new Set();

for (const subUrl of subSitemapUrls) {
  const res = await fetchSubSitemap(subUrl);
  if (res.status !== 200 || !res.body.includes("<url>")) {
    console.error(`   ${c.red}✗${c.reset} Sub-sitemap failed: ${subUrl} → ${res.status || res.error}`);
    continue;
  }
  const locs = extractLocs(res.body);
  for (const loc of locs) allUrls.add(loc);
  console.log(`   ${c.green}✓${c.reset} ${subUrl.split("type=")[1] || subUrl} → ${locs.length} URLs`);
}

console.log(`\n   ${c.bold}Total unique URLs to test: ${allUrls.size}${c.reset}\n`);

if (allUrls.size === 0) {
  console.error(`${c.red}✗ No URLs found in sitemap.${c.reset}`);
  process.exit(1);
}

/* ── 3. Test each URL (with concurrency limit) ── */

const results = { pass: 0, fail: 0, warn: 0 };
const failures = [];
const warnings = [];
const urlArray = [...allUrls];

async function testUrl(url) {
  const r = await safeFetch(url);

  if (r.error) {
    failures.push({ url, reason: `Timeout/Error: ${r.error}` });
    results.fail++;
    return;
  }

  // 404 or 5xx → failure
  if (r.status === 404 || r.status >= 500) {
    failures.push({ url, reason: `HTTP ${r.status}` });
    results.fail++;
    return;
  }

  // Redirect to admin/dashboard → failure
  if (r.location && /\/(admin|dashboard)/i.test(r.location)) {
    failures.push({ url, reason: `Redirect to ${r.location}` });
    results.fail++;
    return;
  }

  // 3xx (non-admin redirect) → warning
  if (r.status >= 300 && r.status < 400) {
    warnings.push({ url, reason: `Redirect ${r.status} → ${r.location || "unknown"}` });
    results.warn++;
    return;
  }

  results.pass++;
}

// Process in batches
for (let i = 0; i < urlArray.length; i += CONCURRENCY) {
  const batch = urlArray.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(testUrl));

  // Progress
  const done = Math.min(i + CONCURRENCY, urlArray.length);
  process.stdout.write(`\r   Tested ${done}/${urlArray.length}...`);
}
console.log();

/* ── 4. Report ── */

console.log(`\n${c.bold}${"═".repeat(55)}${c.reset}`);
console.log(`   ${c.green}✓ Passed: ${results.pass}${c.reset}`);
if (results.warn > 0) console.log(`   ${c.yellow}⚠ Warnings: ${results.warn}${c.reset}`);
if (results.fail > 0) console.log(`   ${c.red}✗ Failed: ${results.fail}${c.reset}`);

if (failures.length > 0) {
  console.log(`\n${c.red}${c.bold}❌ Failures:${c.reset}`);
  for (const f of failures) {
    console.log(`   ${c.red}✗${c.reset} ${f.url} → ${f.reason}`);
  }
}

if (warnings.length > 0) {
  console.log(`\n${c.yellow}${c.bold}⚠ Warnings:${c.reset}`);
  for (const w of warnings) {
    console.log(`   ${c.yellow}⚠${c.reset} ${w.url} → ${w.reason}`);
  }
}

// GitHub Actions Summary
if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = failures.length > 0 ? "❌" : "✅";
  let md = `## ${icon} Sitemap Live HTTP Audit\n\n`;
  md += `| Metric | Count |\n|---|---|\n`;
  md += `| Sub-sitemaps | ${subSitemapUrls.length} |\n`;
  md += `| URLs tested | ${allUrls.size} |\n`;
  md += `| Passed | ${results.pass} |\n`;
  md += `| Warnings | ${results.warn} |\n`;
  md += `| Failed | ${results.fail} |\n\n`;

  if (failures.length > 0) {
    md += `### Failures\n\n| URL | Reason |\n|---|---|\n`;
    for (const f of failures.slice(0, 50)) md += `| \`${f.url}\` | ${f.reason} |\n`;
    if (failures.length > 50) md += `| ... | +${failures.length - 50} more |\n`;
    md += `\n`;
  }
  if (warnings.length > 0) {
    md += `### Warnings\n\n| URL | Reason |\n|---|---|\n`;
    for (const w of warnings.slice(0, 20)) md += `| \`${w.url}\` | ${w.reason} |\n`;
    md += `\n`;
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (failures.length === 0) {
  console.log(`\n${c.green}${c.bold}✅ All ${allUrls.size} sitemap URLs are reachable${c.reset}\n`);
  process.exit(0);
} else {
  console.log();
  process.exit(1);
}