#!/usr/bin/env node
/**
 * Procurement Isolation Audit (BUSINESS-WORKFLOW-PROCUREMENT-1)
 * ─────────────────────────────────────────────────────────────
 * Ensures no application code outside the canonical procurement module
 * directly reads/writes the `procurement_*` tables. Also guarantees the
 * pure comparison helper has no Supabase import.
 *
 * Allowed paths for direct table access:
 *   - src/modules/procurement/services/**
 *   - src/integrations/supabase/**       (generated)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const ALLOWED_DIR_PREFIXES = [
  'src/modules/procurement/services/',
  'src/integrations/supabase/',
];

const TABLES = [
  'procurement_requests',
  'procurement_rfqs',
  'procurement_suppliers',
  'procurement_supplier_quotes',
  'procurement_rfq_invitations',
  'procurement_rfq_items',
  'procurement_supplier_quote_items',
];
const TABLE_PATTERN = new RegExp(
  `\\.from\\(\\s*['"](?:${TABLES.join('|')})['"]\\s*\\)`,
);

const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', 'coverage', '.git', '__tests__',
]);
const SKIP_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.otf', '.lock', '.css', '.scss',
  '.md', '.mdx', '.json',
]);

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (SKIP_EXT.has(ext)) continue;
      if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) continue;
      yield full;
    }
  }
}

function isAllowed(rel) {
  return ALLOWED_DIR_PREFIXES.some((d) => rel.startsWith(d));
}

const violations = [];
const allowed = [];
const pureViolations = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  const src = fs.readFileSync(file, 'utf8');
  const reTable = new RegExp(TABLE_PATTERN.source, 'g');
  let m;
  while ((m = reTable.exec(src)) !== null) {
    const line = src.slice(0, m.index).split('\n').length;
    const snippet = src.slice(m.index, m.index + 120).replace(/\s+/g, ' ').trim();
    const rec = { file: rel, line, snippet };
    if (isAllowed(rel)) allowed.push(rec); else violations.push(rec);
  }
}

const pureFile = path.join(ROOT, 'src/modules/procurement/services/quoteComparison.ts');
if (fs.existsSync(pureFile)) {
  const src = fs.readFileSync(pureFile, 'utf8');
  if (/from\s+['"]@\/integrations\/supabase\/client['"]/.test(src) ||
      /from\s+['"]@supabase\/supabase-js['"]/.test(src)) {
    pureViolations.push({ file: 'src/modules/procurement/services/quoteComparison.ts',
      reason: 'Pure helper must not import Supabase' });
  }
}

const pureFile2 = path.join(ROOT, 'src/modules/procurement/services/quoteComparisonLineItems.ts');
if (fs.existsSync(pureFile2)) {
  const src = fs.readFileSync(pureFile2, 'utf8');
  if (/from\s+['"]@\/integrations\/supabase\/client['"]/.test(src) ||
      /from\s+['"]@supabase\/supabase-js['"]/.test(src)) {
    pureViolations.push({
      file: 'src/modules/procurement/services/quoteComparisonLineItems.ts',
      reason: 'Pure helper must not import Supabase',
    });
  }
}

const summary = `## 🛒 Procurement Isolation Audit\n\n` +
  `| Metric | Value |\n|--------|-------|\n` +
  `| Allowed wrapper accesses | ${allowed.length} |\n` +
  `| Direct table violations | ${violations.length} |\n` +
  `| Pure-helper Supabase imports | ${pureViolations.length} |\n\n`;

const failures = violations.length + pureViolations.length;
if (failures > 0) {
  let report = summary;
  if (violations.length) {
    report += `### ❌ Unauthorized procurement table access\n\n| Location | Snippet |\n|----------|---------|\n` +
      violations.map((v) => `| \`${v.file}:${v.line}\` | \`${v.snippet}\` |`).join('\n') + '\n\n';
  }
  if (pureViolations.length) {
    report += `### ❌ Pure helper imports Supabase\n\n` +
      pureViolations.map((v) => `- ${v.file} — ${v.reason}`).join('\n') + '\n';
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  process.exit(1);
} else {
  const report = summary + `✅ No unauthorized procurement table access. (${allowed.length} allowed wrapper accesses.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}