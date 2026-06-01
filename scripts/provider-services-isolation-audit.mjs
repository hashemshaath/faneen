#!/usr/bin/env node
/**
 * SERVICE-ACTIVATION-GOVERNANCE-2 — Phase F
 *
 * Provider Services Activation Isolation Audit
 * ────────────────────────────────────────────
 * Ensures no application code writes the governance fields on
 * `business_services` outside the canonical module
 * `src/modules/providerServices/**`.
 *
 * Guarded fields:
 *   provider_status, admin_status, required_plan_tier,
 *   requires_admin_review, is_premium_service, is_featured,
 *   admin_note, provider_note, rejection_reason,
 *   reviewed_by, reviewed_at
 *
 * `is_active` is intentionally NOT guarded here — legacy compatibility
 * writes are still permitted (catalog, branches, bnpl) but should be
 * migrated case-by-case in a later phase.
 *
 * Exit 1 on any violation.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

const ALLOWED_DIRS = ['src/modules/providerServices/'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '__tests__']);
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.css', '.scss']);

const FIELDS = [
  'provider_status',
  'admin_status',
  'required_plan_tier',
  'requires_admin_review',
  'is_premium_service',
  'is_featured',
  'admin_note',
  'provider_note',
  'rejection_reason',
  'reviewed_by',
  'reviewed_at',
];

// Match an object-literal key assignment, e.g. `admin_status: 'allowed'`
// or `provider_status:"paused"`. We require a colon followed by a value
// so we don't flag reads of the same identifier.
const FIELD_WRITE = new RegExp(
  String.raw`\b(${FIELDS.join('|')})\s*:\s*['"\w\[\{]`,
);

// Must appear together with a business_services mutation chain to count.
const BS_UPDATE = /\.from\(\s*['"]business_services['"]\s*\)\s*\.\s*(update|upsert|insert)\b/;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (SKIP_EXT.has(ext)) continue;
      if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) continue;
      yield full;
    }
  }
}

const isAllowed = (rel) => ALLOWED_DIRS.some((d) => rel.startsWith(d));

const violations = [];
for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');
  if (isAllowed(rel)) continue;
  const src = fs.readFileSync(file, 'utf-8');
  if (!BS_UPDATE.test(src)) continue;
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = FIELD_WRITE.exec(lines[i]);
    if (m) {
      violations.push({
        file: rel,
        line: i + 1,
        field: m[1],
        snippet: lines[i].trim().slice(0, 160),
      });
    }
  }
}

const header = `## 🛡️  Provider Services Activation Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed path | \`src/modules/providerServices/**\` |
| Guarded fields | ${FIELDS.length} |
| Violations | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map((v) => `| \`${v.file}:${v.line}\` | \`${v.field}\` | \`${v.snippet}\` |`)
    .join('\n');
  const report = header + `### ❌ Unauthorized governance-field writes

| Location | Field | Snippet |
|----------|-------|---------|
${table}
`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  console.error(report);
  console.error(
    `\n❌ ${violations.length} unauthorized governance write(s). Route through @/modules/providerServices.\n`,
  );
  process.exit(1);
} else {
  const report = header + '✅ No unauthorized provider-service governance writes found.\n';
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  console.log(report);
}