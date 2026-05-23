#!/usr/bin/env node
/**
 * Edge Credits Isolation Audit (EDGE-5)
 * ─────────────────────────────────────
 * Ensures no Supabase edge function directly accesses the provider lead
 * credits ledger table or the credit-domain RPCs outside the canonical
 * server-side credits module.
 *
 * Scope:
 *   - supabase/functions/**\/*.ts only
 *   - src/** is covered by scripts/credits-isolation-audit.mjs and is
 *     intentionally NOT scanned here.
 *
 * Allowed boundary:
 *   - supabase/functions/_shared/credits/**
 *
 * Guarded tables:
 *   - provider_lead_credit_transactions
 *
 * Guarded RPCs:
 *   - consume_provider_lead_credit
 *   - grant_monthly_provider_credit
 *   - admin_adjust_provider_credits
 *
 * Test files (*_test.ts, *.test.ts) are skipped.
 *
 * Exit 1 if any unauthorized direct access is found.
 * Filesystem-only — no network.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCAN_ROOT = path.join(ROOT, "supabase", "functions");

const ALLOWED_DIRS = ["supabase/functions/_shared/credits/"];

const GUARDED_TABLES = [
  "provider_lead_credit_transactions",
];

const GUARDED_RPCS = [
  "consume_provider_lead_credit",
  "grant_monthly_provider_credit",
  "admin_adjust_provider_credits",
];

const TABLE_PATTERN = new RegExp(
  `\\.from\\(\\s*['"](${GUARDED_TABLES.join("|")})['"]\\s*\\)`
);
const RPC_PATTERN = new RegExp(
  `\\.rpc\\(\\s*['"](${GUARDED_RPCS.join("|")})['"]`
);

const SKIP_DIRS = new Set([
  "node_modules", "dist", "build", "coverage", ".git", ".deno",
]);
const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".otf", ".lock", ".css", ".scss", ".md",
]);

function isTestFile(name) {
  return (
    name.endsWith("_test.ts") ||
    name.endsWith("_test.tsx") ||
    name.endsWith(".test.ts") ||
    name.endsWith(".test.tsx") ||
    name.endsWith(".spec.ts") ||
    name.endsWith(".spec.tsx")
  );
}

function* walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (SKIP_EXT.has(ext)) continue;
      if (isTestFile(entry.name)) continue;
      // Only .ts in edge functions
      if (ext !== ".ts") continue;
      yield full;
    }
  }
}

function isAllowed(rel) {
  return ALLOWED_DIRS.some((dir) => rel.startsWith(dir));
}

const violations = [];
let allowedTableHits = 0;
let allowedRpcHits = 0;

for (const file of walk(SCAN_ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf-8");
  const lines = source.split("\n");
  const allowed = isAllowed(rel);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip pure comment lines.
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

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

const summary = `## 🛡️ Edge Credits Isolation Audit

| Metric | Value |
|--------|-------|
| Scan root | \`supabase/functions/**\` |
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
    `### ❌ Unauthorized direct credits access in edge functions

| Location | Kind | Name | Snippet |
|----------|------|------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct credits table/RPC access(es) in supabase/functions/**.\n   All edge access must route through: supabase/functions/_shared/credits/\n`
  );
  process.exit(1);
} else {
  const report = summary + "✅ No unauthorized direct credits table/RPC access found in edge functions.\n";
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}