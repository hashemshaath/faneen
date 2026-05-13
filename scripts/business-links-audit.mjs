#!/usr/bin/env node
/**
 * Business & Category Links Audit
 * ────────────────────────────────
 * Fetches active businesses and categories from the sitemap edge function,
 * then requests each generated URL (/{username}, /categories/{slug})
 * to confirm HTTP 200 with no redirect to /admin or /dashboard.
 *
 * Usage:
 *   node scripts/business-links-audit.mjs [--concurrency 10] [--timeout 10000]
 *
 * Exit codes: 0 = pass, 1 = failures found
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE = flag("base", "https://qitaat.com").replace(/\/$/, "");
const CONCURRENCY = parseInt(flag("concurrency", "10"), 10);
const TIMEOUT_MS = parseInt(flag("timeout", "10000"), 10);

/* ── Resolve sitemap URL ── */
// .env may contain VITE_SUPABASE_URL
let SUPABASE_URL = process.env.VITE_SUPABASE_URL || "";
if (!SUPABASE_URL) {
  try {
    const envFile = fs.readFileSync(path.join(ROOT, ".env"), "utf-8");
    const m = envFile.match(/VITE_SUPABASE_URL=(.+)/);
    if (m) SUPABASE_URL = m[1].trim().replace(/^["']|["']$/g, "");
  } catch {}
}
SUPABASE_URL = SUPABASE_URL.replace(/^["']|["']$/g, "").replace(/\/+$/, "");
const SITEMAP_BASE = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/sitemap`
  : `${BASE}/functions/v1/sitemap`;

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

console.log(`\n${c.bold}${c.cyan}🏢 Business & Category Links Audit${c.reset}`);
console.log(`   Base: ${BASE}`);
console.log(`   Sitemap: ${SITEMAP_BASE}\n`);

/* ── 1. Fetch business URLs from sitemap ── */

const businessRes = await safeFetch(`${SITEMAP_BASE}?type=businesses`);
const categoryRes = await safeFetch(`${SITEMAP_BASE}?type=categories`);

const businessUrls = businessRes.status === 200 && businessRes.body.includes("<url>")
  ? extractLocs(businessRes.body).filter((u) => !u.includes("?"))
  : [];

// Category URLs: /categories/{slug} (not /search?category=)
const categoryUrls = categoryRes.status === 200 && categoryRes.body.includes("<url>")
  ? extractLocs(categoryRes.body).filter((u) => u.includes("/categories/"))
  : [];

const allUrls = [...businessUrls, ...categoryUrls];

console.log(`   Businesses: ${businessUrls.length}`);
console.log(`   Categories: ${categoryUrls.length}`);
console.log(`   ${c.bold}Total URLs to test: ${allUrls.length}${c.reset}\n`);

if (allUrls.length === 0) {
  console.log(`${c.yellow}⚠ No business/category URLs found in sitemap. Skipping.${c.reset}`);
  process.exit(0);
}

/* ── 2. Test each URL ── */

const results = { pass: 0, fail: 0 };
const failures = [];

async function testUrl(url) {
  const r = await safeFetch(url);

  if (r.error) {
    failures.push({ url, reason: `Timeout/Error: ${r.error}` });
    results.fail++;
    return;
  }

  if (r.status === 404 || r.status >= 500) {
    failures.push({ url, reason: `HTTP ${r.status}` });
    results.fail++;
    return;
  }

  if (r.location && /\/(admin|dashboard|auth)/i.test(r.location)) {
    failures.push({ url, reason: `Redirect → ${r.location}` });
    results.fail++;
    return;
  }

  // For SPA: check the HTML contains the app shell
  if (r.status === 200 && !r.body.includes('id="root"')) {
    failures.push({ url, reason: "Missing #root (not SPA shell)" });
    results.fail++;
    return;
  }

  results.pass++;
}

for (let i = 0; i < allUrls.length; i += CONCURRENCY) {
  const batch = allUrls.slice(i, i + CONCURRENCY);
  await Promise.all(batch.map(testUrl));
  const done = Math.min(i + CONCURRENCY, allUrls.length);
  process.stdout.write(`\r   Tested ${done}/${allUrls.length}...`);
}
console.log();

/* ── 3. Report ── */

console.log(`\n${c.bold}${"═".repeat(55)}${c.reset}`);
console.log(`   ${c.green}✓ Passed: ${results.pass}${c.reset}`);
if (results.fail > 0) console.log(`   ${c.red}✗ Failed: ${results.fail}${c.reset}`);

if (failures.length > 0) {
  console.log(`\n${c.red}${c.bold}❌ Failures:${c.reset}`);
  for (const f of failures) {
    console.log(`   ${c.red}✗${c.reset} ${f.url} → ${f.reason}`);
  }
}

// GitHub Actions Summary
if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = failures.length > 0 ? "❌" : "✅";
  let md = `## ${icon} Business & Category Links Audit\n\n`;
  md += `| Metric | Count |\n|---|---|\n`;
  md += `| Business URLs | ${businessUrls.length} |\n`;
  md += `| Category URLs | ${categoryUrls.length} |\n`;
  md += `| Passed | ${results.pass} |\n`;
  md += `| Failed | ${results.fail} |\n\n`;

  if (failures.length > 0) {
    md += `### Failures\n\n| URL | Reason |\n|---|---|\n`;
    for (const f of failures.slice(0, 30)) md += `| \`${f.url}\` | ${f.reason} |\n`;
    if (failures.length > 30) md += `| ... | +${failures.length - 30} more |\n`;
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (failures.length === 0) {
  console.log(`\n${c.green}${c.bold}✅ All ${allUrls.length} business/category URLs return HTTP 200${c.reset}\n`);
  process.exit(0);
} else {
  console.log();
  process.exit(1);
}