#!/usr/bin/env node
/**
 * Sitemap Performance Audit
 * ─────────────────────────
 * Fetches the live sitemap index and each sub-sitemap, measures response
 * times, and fails CI if any endpoint exceeds the configured threshold.
 *
 * Usage:
 *   node scripts/sitemap-perf-audit.mjs [--threshold 3000] [--base-url https://qitaat.com]
 *
 * Exit codes: 0 = pass, 1 = failures
 */
import { appendFileSync } from 'node:fs';

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

// ── CLI args ────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
}

const BASE_URL = flag('base-url', 'https://qitaat.com');
const THRESHOLD_MS = parseInt(flag('threshold', '3000'), 10);
const SITEMAP_FUNC = `${BASE_URL}/functions/v1/sitemap`;
const SUB_TYPES = ['static', 'businesses', 'blog', 'categories', 'cities', 'profiles', 'projects'];

console.log(`\n${c.bold}${c.cyan}⏱️  Sitemap Performance Audit${c.reset}`);
console.log(`   Base URL:   ${BASE_URL}`);
console.log(`   Threshold:  ${THRESHOLD_MS}ms\n`);

// ── Measure helper ──────────────────────────────────────
async function measure(url, label) {
  const start = performance.now();
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SitemapPerfAudit/1.0' },
      signal: AbortSignal.timeout(Math.max(THRESHOLD_MS * 2, 10000)),
    });
    const body = await res.text();
    const elapsed = Math.round(performance.now() - start);
    return { label, url, status: res.status, elapsed, size: body.length, ok: true };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    return { label, url, status: 0, elapsed, size: 0, ok: false, error: err.message };
  }
}

// ── Run measurements ────────────────────────────────────
const results = [];

// 1. Sitemap index (no type param)
results.push(await measure(SITEMAP_FUNC, 'sitemap-index'));

// 2. Each sub-sitemap
for (const t of SUB_TYPES) {
  results.push(await measure(`${SITEMAP_FUNC}?type=${t}`, `sub:${t}`));
}

// ── Evaluate ────────────────────────────────────────────
const failures = [];
const warnings = [];

for (const r of results) {
  const icon = r.ok && r.status === 200 && r.elapsed <= THRESHOLD_MS
    ? `${c.green}✓${c.reset}`
    : r.elapsed > THRESHOLD_MS
      ? `${c.red}✗${c.reset}`
      : `${c.yellow}⚠${c.reset}`;

  const sizeKb = (r.size / 1024).toFixed(1);
  const timeColor = r.elapsed > THRESHOLD_MS ? c.red : r.elapsed > THRESHOLD_MS * 0.7 ? c.yellow : c.green;

  console.log(`   ${icon}  ${r.label.padEnd(20)} ${timeColor}${r.elapsed}ms${c.reset}  ${r.status}  ${sizeKb}KB`);

  if (!r.ok) {
    failures.push({ ...r, reason: `Fetch failed: ${r.error}` });
  } else if (r.status !== 200) {
    failures.push({ ...r, reason: `HTTP ${r.status}` });
  } else if (r.elapsed > THRESHOLD_MS) {
    failures.push({ ...r, reason: `${r.elapsed}ms > ${THRESHOLD_MS}ms threshold` });
  } else if (r.elapsed > THRESHOLD_MS * 0.7) {
    warnings.push({ ...r, reason: `${r.elapsed}ms approaching threshold (${THRESHOLD_MS}ms)` });
  }
}

// ── Summary stats ───────────────────────────────────────
const times = results.filter(r => r.ok).map(r => r.elapsed);
const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
const max = times.length ? Math.max(...times) : 0;
const min = times.length ? Math.min(...times) : 0;
const p95 = times.length ? times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)] : 0;

console.log(`\n${c.bold}📊 Statistics${c.reset}`);
console.log(`   Endpoints:  ${results.length}`);
console.log(`   Min:        ${min}ms`);
console.log(`   Avg:        ${avg}ms`);
console.log(`   P95:        ${p95}ms`);
console.log(`   Max:        ${max}ms`);
console.log(`   Threshold:  ${THRESHOLD_MS}ms`);

// ── Report ──────────────────────────────────────────────
console.log(`\n${c.bold}${'═'.repeat(55)}${c.reset}`);

if (warnings.length > 0) {
  console.log(`\n${c.yellow}${c.bold}⚠ Warnings (${warnings.length})${c.reset}`);
  for (const w of warnings) {
    console.log(`   ${c.yellow}⚠${c.reset}  ${w.label}: ${w.reason}`);
  }
}

if (failures.length > 0) {
  console.log(`\n${c.red}${c.bold}❌ Failures (${failures.length})${c.reset}`);
  for (const f of failures) {
    console.log(`   ${c.red}✗${c.reset}  ${f.label}: ${f.reason}`);
  }
}

// ── GitHub Actions Job Summary ──────────────────────────
if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = failures.length > 0 ? '❌' : warnings.length > 0 ? '⚠️' : '✅';
  let md = `## ${icon} Sitemap Performance Report\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Threshold | ${THRESHOLD_MS}ms |\n`;
  md += `| Endpoints tested | ${results.length} |\n`;
  md += `| Min | ${min}ms |\n`;
  md += `| Avg | ${avg}ms |\n`;
  md += `| P95 | ${p95}ms |\n`;
  md += `| Max | ${max}ms |\n`;
  md += `| Failures | ${failures.length} |\n`;
  md += `| Warnings | ${warnings.length} |\n\n`;

  md += `### Response Times\n\n| Endpoint | Status | Time | Size |\n|---|---|---|---|\n`;
  for (const r of results) {
    const icon2 = r.ok && r.status === 200 && r.elapsed <= THRESHOLD_MS ? '✅' : r.elapsed > THRESHOLD_MS ? '❌' : '⚠️';
    md += `| ${icon2} \`${r.label}\` | ${r.status} | ${r.elapsed}ms | ${(r.size / 1024).toFixed(1)}KB |\n`;
  }
  md += `\n`;

  if (failures.length > 0) {
    md += `### Failures\n\n| Endpoint | Reason |\n|---|---|\n`;
    for (const f of failures) md += `| \`${f.label}\` | ${f.reason} |\n`;
    md += `\n`;
  }

  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(`\n📝 GitHub Job Summary written`);
}

if (failures.length === 0) {
  console.log(`\n${c.green}${c.bold}✅ All ${results.length} sitemap endpoints responded within ${THRESHOLD_MS}ms${c.reset}\n`);
  process.exit(0);
} else {
  console.log();
  process.exit(1);
}