#!/usr/bin/env node
/**
 * Notifications Isolation Audit
 * ─────────────────────────────
 * Ensures no application code directly accesses notification backend
 * resources (notifications / notification_preferences /
 * business_notification_preferences tables, or their realtime
 * postgres_changes channels) outside the canonical wrappers under
 * src/modules/notifications/services/**.
 *
 * Rules enforced:
 *   1. Direct table access (select/insert/update/delete/upsert) on:
 *        notifications, notification_preferences,
 *        business_notification_preferences
 *   2. Direct realtime postgres_changes config referencing
 *        table: 'notifications'
 *
 * Out of scope (intentionally NOT flagged):
 *   - Client-site notification RPCs in
 *     src/components/client-sites/ClientSiteNotificationPreferencesCard.tsx
 *     (get_client_site_notification_preferences /
 *      update_client_site_notification_preferences). These are governed
 *     by the client-sites track, not the notifications isolation track.
 *   - Notification insert wrapper guardrail remains in
 *     scripts/notifications-insert-isolation-audit.mjs.
 *   - Transactional email invocations remain governed by
 *     scripts/transactional-email-isolation-audit.mjs.
 *
 * Allowed production paths:
 *   - src/modules/notifications/services/**
 *   - src/modules/notifications/index.ts (re-exports only)
 *
 * Test files (`__tests__/`, `.test.ts`, `.test.tsx`) and the generated
 * Supabase types file are skipped.
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

const ALLOWED_DIRS = [
  "src/modules/notifications/services/",
];
const ALLOWED_FILES = new Set([
  "src/modules/notifications/index.ts",
]);

const TABLES = [
  "notifications",
  "notification_preferences",
  "business_notification_preferences",
];
const REALTIME_TABLES = ["notifications"];

const tableUnion = TABLES.join("|");
const TABLE_PATTERN = new RegExp(
  `\\.from\\(\\s*['"](${tableUnion})['"]\\s*\\)\\s*\\.\\s*(select\\s*\\(|insert|update|delete|upsert)\\b`,
);

const realtimeUnion = REALTIME_TABLES.join("|");
const REALTIME_PATTERN = new RegExp(
  `postgres_changes[\\s\\S]{0,200}?table\\s*:\\s*['"](${realtimeUnion})['"]`,
);

const SKIP_DIRS = new Set([
  "node_modules", "dist", "build", "coverage", ".git", "__tests__",
]);
const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".otf", ".lock", ".css", ".scss",
]);
const SKIP_FILES = new Set([
  "src/integrations/supabase/types.ts",
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

function scan(source, pattern, kind, captureGroup = 1) {
  const hits = [];
  if (!pattern.test(source)) return hits;
  const re = new RegExp(pattern.source, "g");
  let m;
  while ((m = re.exec(source)) !== null) {
    const upto = source.slice(0, m.index);
    const line = upto.split("\n").length;
    const target = captureGroup > 0 ? (m[captureGroup] ?? "") : "";
    const snippet = source
      .slice(m.index, m.index + 160)
      .replace(/\s+/g, " ")
      .trim();
    hits.push({ kind, target, line, snippet });
  }
  return hits;
}

const violations = [];
const allowedHits = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (SKIP_FILES.has(rel)) continue;
  const source = fs.readFileSync(file, "utf-8");

  const hits = [
    ...scan(source, TABLE_PATTERN, "table", 1),
    ...scan(source, REALTIME_PATTERN, "realtime", 1),
  ];

  for (const h of hits) {
    const record = { file: rel, ...h };
    if (isAllowed(rel)) allowedHits.push(record);
    else violations.push(record);
  }
}

const allowedList = [
  ...ALLOWED_DIRS.map((d) => `\`${d}**\``),
  ...[...ALLOWED_FILES].map((f) => `\`${f}\``),
].join(", ");

const summary = `## 🔔 Notifications Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Tables enforced | \`${TABLES.join(", ")}\` |
| Realtime tables enforced | \`${REALTIME_TABLES.join(", ")}\` (postgres_changes) |
| Allowed matches | ${allowedHits.length} |
| Violations found | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map(
      (v) =>
        `| \`${v.file}:${v.line}\` | \`${v.kind}\` | \`${v.target}\` | \`${v.snippet}\` |`,
    )
    .join("\n");

  const report =
    summary +
    `### ❌ Unauthorized direct notification backend access

| Location | Rule | Target | Snippet |
|----------|------|--------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct notification access(es).\n   All app access must route through canonical wrappers under:\n     - src/modules/notifications/services/\n   (Client-site notification RPCs are intentionally out of scope.)\n   Or be added to the explicit allowlist in scripts/notifications-isolation-audit.mjs\n`,
  );
  process.exit(1);
} else {
  const report =
    summary +
    `✅ No unauthorized direct notification access found. (${allowedHits.length} allowed matches.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}