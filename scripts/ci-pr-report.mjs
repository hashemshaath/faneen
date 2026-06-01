#!/usr/bin/env node
/**
 * CI PR Report
 * ─────────────
 * Runs the three guardrails that matter most on every PR and produces
 * a single Markdown summary suitable for `$GITHUB_STEP_SUMMARY` and a
 * downloadable artifact:
 *   1. bunx vitest run                  (full unit suite)
 *   2. broken-links-audit.mjs           (internal links)
 *   3. sitemap-integrity-audit.mjs      (sitemap ↔ routes)
 *
 * Exit code: 1 if any of the three failed; 0 otherwise. The script
 * never throws — every failure is captured and surfaced in the report.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'ci-report');
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

/** Run a shell command and capture stdout/stderr without throwing. */
function run(label, cmd, args) {
  const started = Date.now();
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: false });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const ok = r.status === 0;
  const stdout = r.stdout ?? '';
  const stderr = r.stderr ?? '';
  writeFileSync(resolve(OUT_DIR, `${label}.log`), `$ ${cmd} ${args.join(' ')}\n\n${stdout}\n${stderr}`);
  return { label, ok, code: r.status ?? -1, elapsed, stdout, stderr };
}

/** Strip ANSI color codes for clean Markdown rendering. */
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

/** Extract affected internal links from broken-links-audit output. */
function parseBrokenLinks(stdout) {
  const lines = stripAnsi(stdout).split('\n');
  const affected = [];
  for (const raw of lines) {
    const line = raw.trim();
    // Common shapes: "BROKEN  /foo/bar in src/x.tsx:12"
    //                "✗ /admin/missing  (src/x.tsx)"
    const m = line.match(/(\/[\w\-/:.{}*]+)/g);
    if (!m) continue;
    if (/broken|missing|✗|❌|unknown route/i.test(line)) {
      for (const href of m) {
        if (href.startsWith('/') && !affected.includes(href)) affected.push(href);
      }
    }
  }
  return affected;
}

/** Extract failing test names from vitest text output (best-effort). */
function parseVitestFailures(stdout) {
  const lines = stripAnsi(stdout).split('\n');
  const fails = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (/^(FAIL|×|✗)\s+/.test(line)) fails.push(line.replace(/^(FAIL|×|✗)\s+/, ''));
  }
  return fails.slice(0, 50);
}

/** Extract failing finding summaries from sitemap-integrity-audit output. */
function parseSitemapFindings(stdout) {
  const lines = stripAnsi(stdout).split('\n');
  const issues = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (/(FAIL|✗|❌|error|issue)/i.test(line) && line.length < 240) {
      issues.push(line.replace(/^[•\-\*\s]+/, ''));
    }
  }
  return issues.slice(0, 50);
}

/* ─── Run all three checks ─── */
const results = [
  run('vitest',          'npx', ['vitest', 'run', '--reporter=default']),
  run('broken-links',    'node', ['scripts/broken-links-audit.mjs']),
  run('sitemap-integrity', 'node', ['scripts/sitemap-integrity-audit.mjs']),
];

const [vitest, broken, sitemap] = results;
const brokenLinks = parseBrokenLinks(broken.stdout + '\n' + broken.stderr);
const vitestFails = parseVitestFailures(vitest.stdout + '\n' + vitest.stderr);
const sitemapIssues = parseSitemapFindings(sitemap.stdout + '\n' + sitemap.stderr);

const icon = (ok) => (ok ? '✅' : '❌');
const overallOk = results.every((r) => r.ok);

/* ─── Build Markdown summary ─── */
const lines = [];
lines.push(`# 🔎 CI PR Report${overallOk ? '' : ' — failures detected'}`);
lines.push('');
lines.push('| Check | Status | Exit | Time |');
lines.push('| --- | :---: | :---: | ---: |');
for (const r of results) {
  lines.push(`| \`${r.label}\` | ${icon(r.ok)} ${r.ok ? 'PASS' : 'FAIL'} | ${r.code} | ${r.elapsed}s |`);
}
lines.push('');

if (!vitest.ok && vitestFails.length) {
  lines.push('## ❌ Failing tests');
  for (const f of vitestFails) lines.push(`- \`${f}\``);
  lines.push('');
}

if (brokenLinks.length) {
  lines.push('## 🔗 Affected internal links');
  for (const href of brokenLinks) lines.push(`- \`${href}\``);
  lines.push('');
} else if (broken.ok) {
  lines.push('## 🔗 Internal links');
  lines.push('No broken internal links detected.');
  lines.push('');
}

if (!sitemap.ok && sitemapIssues.length) {
  lines.push('## 🗺️ Sitemap integrity issues');
  for (const i of sitemapIssues) lines.push(`- ${i}`);
  lines.push('');
}

lines.push('---');
lines.push('_Full logs are uploaded as the `ci-report` workflow artifact._');
const md = lines.join('\n');

writeFileSync(resolve(OUT_DIR, 'summary.md'), md);

/* Pipe to GitHub Actions step summary when available. */
if (process.env.GITHUB_STEP_SUMMARY) {
  try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); } catch { /* no-op */ }
}

/* Always print to console too so it shows in raw logs. */
console.log(md);

process.exit(overallOk ? 0 : 1);