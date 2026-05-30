#!/usr/bin/env node
/**
 * Brands Isolation Audit (BRANDS-GOVERNANCE-2)
 * ────────────────────────────────────────────
 * Ensures no application code directly accesses brand registry tables,
 * the brands_public view, or admin/provider-link brand RPCs outside the
 * canonical brands service-layer wrappers.
 *
 * Allowed direct access (production):
 *   - src/modules/brands/services/**
 *
 * Test files and generated Supabase types are skipped.
 *
 * Exit 1 if any unauthorized direct access is found.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const ALLOWED_DIRS = ["src/modules/brands/services/"];
const ALLOWED_FILES = new Set([
  "src/integrations/supabase/types.ts",
]);

const GUARDED_TABLES = [
  "brand_catalog",
  "brand_manufacturing_countries",
  "brand_sector_links",
  "brand_audit_logs",
  "brand_addition_requests",
  "business_service_brands",
  "brands_public",
];

const GUARDED_RPCS = [
  "admin_approve_brand",
  "admin_reject_brand",
  "admin_archive_brand",
  "admin_merge_brands",
  "admin_approve_provider_brand_link",
  "admin_reject_provider_brand_link",
  "approve_brand_addition_request",
  "reject_brand_addition_request",
];

const TABLE_PATTERN = new RegExp(
  `\\.from\\(\\s*['"](${GUARDED_TABLES.join("|")})['"]\\s*\\)`
);
const RPC_PATTERN = new RegExp(
  `\\.rpc\\(\\s*['"](${GUARDED_RPCS.join("|")})['"]`
);

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
      if (
        entry.name.endsWith(".test.ts") ||
        entry.name.endsWith(".test.tsx") ||
        entry.name.endsWith(".spec.ts") ||
        entry.name.endsWith(".spec.tsx")
      ) continue;
      yield full;
    }
  }
}

function isAllowed(rel) {
  if (ALLOWED_FILES.has(rel)) return true;
  return ALLOWED_DIRS.some((dir) => rel.startsWith(dir));
}

const violations = [];
let allowedTableHits = 0;
let allowedRpcHits = 0;

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf-8");
  const lines = source.split("\n");
  const allowed = isAllowed(rel);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const tableMatch = line.match(TABLE_PATTERN);
    const rpcMatch = line.match(RPC_PATTERN);
    if (!tableMatch && !rpcMatch) continue;

    if (allowed) {
      if (tableMatch) allowedTableHits++;
      if (rpcMatch) allowedRpcHits++;
      continue;
    }

    violations.push({
      file: rel,
      line: i + 1,
      kind: tableMatch ? "table" : "rpc",
      name: (tableMatch || rpcMatch)[1],
      snippet: line.trim().slice(0, 160),
    });
  }
}

const allowedList = ALLOWED_DIRS.map((d) => `\`${d}**\``).join(", ");

const summary = `## 🏷️ Brands Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Guarded tables | ${GUARDED_TABLES.length} |
| Guarded RPCs | ${GUARDED_RPCS.length} |
| Allowed table matches | ${allowedTableHits} |
| Allowed RPC matches | ${allowedRpcHits} |
| Violations found | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map((v) => `| \`${v.file}:${v.line}\` | ${v.kind} | \`${v.name}\` | \`${v.snippet}\` |`)
    .join("\n");

  const report =
    summary +
    `### ❌ Unauthorized direct brands access

| Location | Kind | Name | Snippet |
|----------|------|------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct brands table/RPC access(es).\n   All app access must route through canonical wrappers under: src/modules/brands/services/\n`
  );
  process.exit(1);
} else {
  const report = summary + "✅ No unauthorized direct brands table/RPC access found.\n";
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}