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
 * SERVICE-ACTIVATION-GOVERNANCE-FINAL (Policy A):
 *   `is_active` IS now guarded — every activation-related write must go
 *   through `@/modules/providerServices`. Non-governance call sites
 *   (e.g. catalog mutations) must drop `is_active` from their payloads
 *   and rely on DB defaults / canonical setters.
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
  'is_active',
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

// Field-key inside an object literal (key: value).
const FIELD_WRITE = new RegExp(String.raw`\b(${FIELDS.join('|')})\s*:`, 'g');

// Locate `.from('business_services').<op>(` start positions in source.
const BS_UPDATE_GLOBAL =
  /\.from\(\s*['"]business_services['"]\s*\)\s*\.\s*(update|upsert|insert)\s*\(/g;

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
  BS_UPDATE_GLOBAL.lastIndex = 0;
  let m;
  while ((m = BS_UPDATE_GLOBAL.exec(src)) !== null) {
    // Balanced-paren walk from the opening `(` of the op call.
    const openIdx = m.index + m[0].length - 1; // index of '('
    let depth = 1;
    let i = openIdx + 1;
    for (; i < src.length && depth > 0; i++) {
      const ch = src[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    const arg = src.slice(openIdx + 1, i - 1);
    FIELD_WRITE.lastIndex = 0;
    let f;
    while ((f = FIELD_WRITE.exec(arg)) !== null) {
      const absolute = openIdx + 1 + f.index;
      const line = src.slice(0, absolute).split('\n').length;
      const snippet = src.split('\n')[line - 1]?.trim().slice(0, 160) ?? '';
      violations.push({ file: rel, line, field: f[1], snippet });
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