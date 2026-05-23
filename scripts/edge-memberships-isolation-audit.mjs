#!/usr/bin/env node
/**
 * Edge Memberships Isolation Audit (MEM-EDGE-5)
 * ─────────────────────────────────────────────
 * Locks the current clean baseline: no Supabase edge function may directly
 * access membership / subscription tables or membership RPCs outside the
 * (future) canonical server-side memberships module.
 *
 * Scope:
 *   - supabase/functions/**\/*.ts only
 *   - src/** is covered by scripts/memberships-isolation-audit.mjs.
 *
 * Allowed boundaries (future-friendly):
 *   - supabase/functions/_shared/memberships/**   (does not exist yet — pre-allowed)
 *
 * Special rule: `provider_subscriptions` is dual-purpose (carries
 * lead_credits_balance) and is OWNED BY THE CREDITS BOUNDARY. It is only
 * permitted in:
 *   - supabase/functions/_shared/credits/**
 *   - supabase/functions/monthly-provider-credit-grant/**
 *
 * Guarded tables (forbidden everywhere outside allowed paths):
 *   - membership_plans
 *   - membership_subscriptions
 *   - membership_upgrade_requests
 *   - membership_access_keys
 *   - membership_access_key_logs
 *   - membership_invite_keys
 *   - membership_invite_redemptions
 *   - promo_codes
 *   - provider_plans
 *   - provider_plan_features
 *   - provider_subscriptions (with credits-owned exception above)
 *
 * Guarded RPCs:
 *   - subscribe_to_plan
 *   - admin_upgrade_subscription
 *   - cancel_subscription
 *   - cancel_provider_subscription
 *   - redeem_promo_code
 *   - has_membership_feature
 *   - get_membership_usage
 *   - admin_list_membership_usage
 *
 * Benign string-only references (e.g. "/membership" in sitemap/robots,
 * email template copy) are unaffected because the patterns require
 * `.from('table')` or `.rpc('name')` shape.
 *
 * Test files (*_test.ts, *.test.ts, *.spec.ts) are skipped.
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

// Future allowed home for membership-owned logic. Pre-allowed even though
// it does not exist yet, so MEM-EDGE-2 can land without script churn.
const MEMBERSHIPS_ALLOWED_DIRS = [
  "supabase/functions/_shared/memberships/",
];

// provider_subscriptions is credits-owned at the edge (lead_credits_balance).
const PROVIDER_SUBSCRIPTIONS_ALLOWED_DIRS = [
  "supabase/functions/_shared/credits/",
  "supabase/functions/monthly-provider-credit-grant/",
];

const PROVIDER_SUBSCRIPTIONS = "provider_subscriptions";

const GUARDED_TABLES_STRICT = [
  "membership_plans",
  "membership_subscriptions",
  "membership_upgrade_requests",
  "membership_access_keys",
  "membership_access_key_logs",
  "membership_invite_keys",
  "membership_invite_redemptions",
  "promo_codes",
  "provider_plans",
  "provider_plan_features",
];

const GUARDED_RPCS = [
  "subscribe_to_plan",
  "admin_upgrade_subscription",
  "cancel_subscription",
  "cancel_provider_subscription",
  "redeem_promo_code",
  "has_membership_feature",
  "get_membership_usage",
  "admin_list_membership_usage",
];

const TABLE_PATTERN_STRICT = new RegExp(
  `\\.from\\(\\s*['"](${GUARDED_TABLES_STRICT.join("|")})['"]\\s*\\)`
);
const TABLE_PATTERN_PROVIDER_SUBS = new RegExp(
  `\\.from\\(\\s*['"](${PROVIDER_SUBSCRIPTIONS})['"]\\s*\\)`
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
  ".map",
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
      if (ext !== ".ts") continue;
      yield full;
    }
  }
}

function isAllowedForMemberships(rel) {
  return MEMBERSHIPS_ALLOWED_DIRS.some((dir) => rel.startsWith(dir));
}
function isAllowedForProviderSubs(rel) {
  return (
    PROVIDER_SUBSCRIPTIONS_ALLOWED_DIRS.some((dir) => rel.startsWith(dir)) ||
    isAllowedForMemberships(rel)
  );
}

const violations = [];
let allowedTableHits = 0;
let allowedRpcHits = 0;
let allowedProviderSubsHits = 0;

for (const file of walk(SCAN_ROOT)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf-8");
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

    const tableStrictMatch = line.match(TABLE_PATTERN_STRICT);
    const tableProviderSubsMatch = line.match(TABLE_PATTERN_PROVIDER_SUBS);
    const rpcMatch = line.match(RPC_PATTERN);
    if (!tableStrictMatch && !tableProviderSubsMatch && !rpcMatch) continue;

    if (tableStrictMatch) {
      if (isAllowedForMemberships(rel)) {
        allowedTableHits++;
      } else {
        violations.push({
          file: rel,
          line: i + 1,
          kind: "table",
          name: tableStrictMatch[1],
          reason: "Direct membership table access outside _shared/memberships/",
          snippet: trimmed.slice(0, 160),
        });
      }
    }

    if (tableProviderSubsMatch) {
      if (isAllowedForProviderSubs(rel)) {
        allowedProviderSubsHits++;
      } else {
        violations.push({
          file: rel,
          line: i + 1,
          kind: "table",
          name: tableProviderSubsMatch[1],
          reason:
            "provider_subscriptions is credits-owned at the edge; allowed only in _shared/credits/ or monthly-provider-credit-grant/",
          snippet: trimmed.slice(0, 160),
        });
      }
    }

    if (rpcMatch) {
      if (isAllowedForMemberships(rel)) {
        allowedRpcHits++;
      } else {
        violations.push({
          file: rel,
          line: i + 1,
          kind: "rpc",
          name: rpcMatch[1],
          reason: "Direct membership RPC call outside _shared/memberships/",
          snippet: trimmed.slice(0, 160),
        });
      }
    }
  }
}

const allowedList = MEMBERSHIPS_ALLOWED_DIRS.map((d) => `\`${d}**\``).join(", ");
const providerSubsAllowedList = PROVIDER_SUBSCRIPTIONS_ALLOWED_DIRS.map(
  (d) => `\`${d}**\``,
).join(", ");

const summary = `## 🛡️ Edge Memberships Isolation Audit

| Metric | Value |
|--------|-------|
| Scan root | \`supabase/functions/**\` |
| Memberships allowed paths | ${allowedList} |
| provider_subscriptions allowed paths | ${providerSubsAllowedList} |
| Guarded membership tables | ${GUARDED_TABLES_STRICT.length} |
| Guarded membership RPCs | ${GUARDED_RPCS.length} |
| Allowed membership-table matches | ${allowedTableHits} |
| Allowed membership-RPC matches | ${allowedRpcHits} |
| Allowed provider_subscriptions matches | ${allowedProviderSubsHits} |
| Violations found | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map(
      (v) =>
        `| \`${v.file}:${v.line}\` | ${v.kind} | \`${v.name}\` | ${v.reason} | \`${v.snippet}\` |`,
    )
    .join("\n");

  const report =
    summary +
    `### ❌ Unauthorized direct membership access in edge functions

| Location | Kind | Name | Reason | Snippet |
|----------|------|------|--------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct membership table/RPC access(es) in supabase/functions/**.\n   Membership logic must route through: supabase/functions/_shared/memberships/\n   provider_subscriptions is credits-owned: supabase/functions/_shared/credits/ or monthly-provider-credit-grant/.\n`,
  );
  process.exit(1);
} else {
  const report =
    summary +
    "✅ No unauthorized direct membership table/RPC access found in edge functions.\n";
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}