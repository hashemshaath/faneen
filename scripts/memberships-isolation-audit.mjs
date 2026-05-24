#!/usr/bin/env node
/**
 * Memberships Isolation Audit
 * ───────────────────────────
 * Ensures no application code directly accesses membership / provider-legacy
 * subscription tables or membership-related RPCs outside the canonical
 * service-layer wrappers.
 *
 * Allowed direct access (production):
 *   - src/modules/memberships/services/**
 *
 * Test files (`__tests__/`, `.test.ts`, `.test.tsx`) are skipped because
 * regression/migration tests intentionally reference the literal strings.
 *
 * Exit 1 if any unauthorized direct access is found.
 * Filesystem-only — no network.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const ALLOWED_DIRS = ["src/modules/memberships/services/"];
const ALLOWED_FILES = new Set();

const GUARDED_TABLES = [
  "membership_plans",
  "membership_subscriptions",
  "membership_upgrade_requests",
  "membership_upgrade_rejections",
  "membership_subscription_events",
  "membership_invite_keys",
  "membership_access_keys",
  "membership_invite_redemptions",
  "membership_access_key_usage_log",
  "membership_promo_codes",
  "membership_promo_code_attempts",
  "provider_plans",
  "provider_subscriptions",
  // R4F-8C: payments scaffold tables — wrappers live under
  // src/modules/memberships/services/payments/.
  "membership_payment_intents",
  "membership_payment_webhook_events",
];

const GUARDED_RPCS = [
  "has_membership_feature",
  "get_membership_usage",
  "subscribe_to_plan",
  "cancel_subscription_at_period_end",
  "resume_subscription_renewal",
  "cancel_subscription",
  "admin_upgrade_subscription",
  "admin_list_membership_usage",
  "redeem_promo_code",
  "generate_invite_key",
  "revoke_invite_key",
  "create_access_key",
  "revoke_access_key",
  "admin_set_business_membership_tier",
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

const summary = `## 🎫 Memberships Isolation Audit

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
    `### ❌ Unauthorized direct membership access

| Location | Kind | Name | Snippet |
|----------|------|------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct membership table/RPC access(es).\n   All app access must route through canonical wrappers under: src/modules/memberships/services/\n`
  );
  process.exit(1);
} else {
  const report = summary + "✅ No unauthorized direct membership table/RPC access found.\n";
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}