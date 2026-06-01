#!/usr/bin/env node
/**
 * Businesses Reads Isolation Audit
 * ────────────────────────────────
 * Ensures no application code directly reads from the `businesses` table
 * outside the canonical service-layer wrappers and a small set of
 * explicitly allowlisted deferred files.
 *
 * Pattern matched (whitespace/newline tolerant):
 *   .from('businesses') ... .select(...)
 *   .from("businesses") ... .select(...)
 *
 * Allowed production paths:
 *   - src/modules/businesses/services/**
 *
 * Writes (`.insert/.update/.delete/.upsert`) are NOT enforced here — they
 * are covered by `businesses-writes-isolation-audit.mjs`.
 *
 * Test files (`__tests__/`, `.test.ts`, `.test.tsx`) are skipped.
 *
 * Exit 1 if any unauthorized direct read is found. Filesystem-only.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const ALLOWED_DIRS = ["src/modules/businesses/services/"];
const ALLOWED_FILES = new Set([
  // BUSINESS-OPERATIONS-2I: narrow opaque-ownership lookup (user_id only)
  // for SLA notification recipient resolution. No PII fields selected.
  "src/modules/operations/services/notificationRecipients.ts",
  // DB-GOVERNANCE-1: narrow opaque-ownership lookup (user_id only) used by
  // provider-services admin moderation to resolve the business owner before
  // sending governance notifications. Same shape as notificationRecipients.
  "src/modules/providerServices/services/admin.ts",
  // DB-GOVERNANCE-1: admin-only KPI dashboard. Selects non-PII columns
  // (id, created_at) for time-bucketed counts. RLS gates access to admins
  // via has_admin_access. Page is useNoIndex.
  "src/pages/admin/AdminKpis.tsx",
  // DB-GOVERNANCE-1: admin-only reports page. Selects governance columns
  // (ref_id, name_*, approval_status, created_at, user_id). RLS gates to
  // admins. Page is useNoIndex. No public route reaches it.
  "src/pages/admin/AdminReports.tsx",
  // DB-GOVERNANCE-1: admin-only system access viewer. Selects display
  // columns (id, name_*, ref_id, logo_url). RLS gates to admins. useNoIndex.
  "src/pages/admin/AdminSystemAccess.tsx",
  // DB-GOVERNANCE-1: provider self-service entity detail. Resolves a ref
  // through the legacy-aware `or(ref_id.eq, legacy_ref_id.eq)` filter that
  // is not yet covered by `getBusinessByRefId` (legacy_ref_id support
  // tracked as a P2 wrapper extension). Only selects `id`. No PII.
  "src/pages/dashboard/DashboardEntityDetail.tsx",
]);

// Whitespace/newline tolerant: `.from('businesses')` ... `.select(`
const PATTERN =
  /\.from\(\s*['"]businesses['"]\s*\)\s*\.\s*select\s*\(/;

const SKIP_DIRS = new Set([
  "node_modules", "dist", "build", "coverage", ".git", "__tests__",
]);
const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".otf", ".lock", ".css", ".scss",
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
      if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) continue;
      yield full;
    }
  }
}

function isAllowed(rel) {
  if (ALLOWED_FILES.has(rel)) return true;
  return ALLOWED_DIRS.some((dir) => rel.startsWith(dir));
}

const violations = [];
const allowedHits = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf-8");
  if (!PATTERN.test(source)) continue;

  // Find every match (multi-line tolerant): scan with a global regex on full source.
  const globalRe = new RegExp(PATTERN.source, "g");
  let m;
  while ((m = globalRe.exec(source)) !== null) {
    const upto = source.slice(0, m.index);
    const line = upto.split("\n").length;
    const snippet = source
      .slice(m.index, m.index + 160)
      .replace(/\s+/g, " ")
      .trim();
    const record = { file: rel, line, snippet };
    if (isAllowed(rel)) allowedHits.push(record);
    else violations.push(record);
  }
}

const allowedList = [
  ...ALLOWED_DIRS.map((d) => `\`${d}**\``),
  ...[...ALLOWED_FILES].map((f) => `\`${f}\``),
].join(", ");

const summary = `## 🏢 Businesses Reads Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Pattern enforced | \`.from('businesses')...select(...)\` |
| Allowed matches | ${allowedHits.length} |
| Violations found | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map((v) => `| \`${v.file}:${v.line}\` | \`${v.snippet}\` |`)
    .join("\n");

  const report =
    summary +
    `### ❌ Unauthorized direct businesses table reads

| Location | Snippet |
|----------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct \`businesses\` read(s).\n   All app reads must route through canonical wrappers under: src/modules/businesses/services/\n   or be added to the explicit allowlist in scripts/businesses-reads-isolation-audit.mjs\n`
  );
  process.exit(1);
} else {
  const report = summary + `✅ No unauthorized direct businesses reads found. (${allowedHits.length} allowed matches.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}