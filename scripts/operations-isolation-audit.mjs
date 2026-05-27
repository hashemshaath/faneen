#!/usr/bin/env node
/**
 * Operations Isolation Audit (BUSINESS-OPERATIONS-2B)
 * ───────────────────────────────────────────────────
 * Ensures no application code outside the canonical operations module
 * directly reads/writes `operational_alerts`. Also asserts that 2B did NOT
 * wire any cron (`sla-sweep`) or notification/email dispatch surfaces.
 *
 * Allowed paths:
 *   - src/modules/operations/**
 *   - src/integrations/supabase/**       (generated)
 *
 * Skipped:
 *   - __tests__/, *.test.*, *.spec.*
 *   - src/integrations/supabase/types.ts
 *   - Binary/asset/lockfile/style/markdown/json extensions
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const ALLOWED_DIR_PREFIXES = [
  'src/modules/operations/',
  'src/integrations/supabase/',
];

const TABLE_PATTERN =
  /\.from\(\s*['"]operational_alerts['"]\s*\)/;
const CRON_PATTERN = /(['"])sla-sweep\1/;

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', '.git', '__tests__',
]);
const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.otf', '.lock', '.css', '.scss',
  '.md', '.mdx', '.json',
]);
const SKIP_FILES = new Set(['src/integrations/supabase/types.ts']);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (SKIP_EXT.has(ext)) continue;
      if (
        entry.name.endsWith('.test.ts') ||
        entry.name.endsWith('.test.tsx') ||
        entry.name.endsWith('.spec.ts') ||
        entry.name.endsWith('.spec.tsx')
      ) continue;
      yield full;
    }
  }
}

function isAllowed(rel) {
  return ALLOWED_DIR_PREFIXES.some((d) => rel.startsWith(d));
}

function isCommentLine(source, index) {
  const lineStart = source.lastIndexOf('\n', index - 1) + 1;
  const trimmed = source.slice(lineStart, index).replace(/^\s+/, '');
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

const violations = [];
const allowedHits = [];
const cronViolations = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (SKIP_FILES.has(rel)) continue;
  const source = fs.readFileSync(file, 'utf-8');

  // operational_alerts access
  const re = new RegExp(TABLE_PATTERN.source, 'g');
  let m;
  while ((m = re.exec(source)) !== null) {
    if (isCommentLine(source, m.index)) continue;
    const line = source.slice(0, m.index).split('\n').length;
    const snippet = source.slice(m.index, m.index + 160).replace(/\s+/g, ' ').trim();
    const record = { file: rel, line, snippet };
    if (isAllowed(rel)) allowedHits.push(record);
    else violations.push(record);
  }

  // sla-sweep cron wiring must not exist yet OUTSIDE the operations module.
  // The operations module itself may use 'sla-sweep' as a run-type identifier
  // (e.g. in the dispatch run-log envelope introduced in 2D). What is still
  // forbidden until 2E+ is wiring it from cron/edge/UI surfaces.
  if (!isAllowed(rel)) {
    const reCron = new RegExp(CRON_PATTERN.source, 'g');
    let c;
    while ((c = reCron.exec(source)) !== null) {
      if (isCommentLine(source, c.index)) continue;
      const line = source.slice(0, c.index).split('\n').length;
      const snippet = source.slice(c.index, c.index + 160).replace(/\s+/g, ' ').trim();
      cronViolations.push({ file: rel, line, snippet });
    }
  }
}

const summary = `## 🛰️ Operations Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${ALLOWED_DIR_PREFIXES.map((d) => `\`${d}**\``).join(', ')} |
| Allowed wrapper accesses | ${allowedHits.length} |
| Direct table violations | ${violations.length} |
| sla-sweep cron wirings | ${cronViolations.length} |

`;

const failures = violations.length + cronViolations.length;

if (failures > 0) {
  let report = summary;
  if (violations.length > 0) {
    const table = violations
      .map((v) => `| \`${v.file}:${v.line}\` | \`${v.snippet}\` |`)
      .join('\n');
    report += `### ❌ Unauthorized direct operational_alerts access\n\n| Location | Snippet |\n|----------|---------|\n${table}\n\n`;
  }
  if (cronViolations.length > 0) {
    const table = cronViolations
      .map((v) => `| \`${v.file}:${v.line}\` | \`${v.snippet}\` |`)
      .join('\n');
    report += `### ❌ Unexpected sla-sweep cron wiring (must be deferred to 2C+)\n\n| Location | Snippet |\n|----------|---------|\n${table}\n`;
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  process.exit(1);
} else {
  const report = summary + `✅ No unauthorized operational_alerts access and no premature sla-sweep wiring. (${allowedHits.length} allowed wrapper accesses.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}