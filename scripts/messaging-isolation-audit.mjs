#!/usr/bin/env node
/**
 * Messaging Isolation Audit
 * ─────────────────────────
 * Ensures no application code directly accesses messaging backend resources
 * (conversations / messages tables, their realtime postgres_changes channels,
 * or the chat-attachments storage bucket) outside the canonical wrappers
 * under src/modules/messaging/**.
 *
 * Rules enforced:
 *   1. Direct table access (select/insert/update/delete/upsert) on:
 *        conversations, messages
 *   2. Direct realtime postgres_changes config referencing
 *        table: 'conversations' or table: 'messages'
 *   3. Direct storage access to bucket `chat-attachments`
 *      (literal string OR `CHAT_ATTACHMENTS_BUCKET` constant).
 *
 * Out of scope (intentionally NOT flagged):
 *   - src/hooks/useTypingPresence.ts: uses supabase.channel(...) for
 *     broadcast/presence only — no tables, no postgres_changes.
 *
 * Allowed production paths:
 *   - src/modules/messaging/services/**
 *   - src/modules/messaging/constants/**
 *   - src/modules/messaging/index.ts (re-exports only)
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
  "src/modules/messaging/services/",
  "src/modules/messaging/constants/",
];
const ALLOWED_FILES = new Set([
  "src/modules/messaging/index.ts",
]);

const TABLES = ["conversations", "messages"];
const STORAGE_BUCKET = "chat-attachments";

// Patterns ────────────────────────────────────────────────────────────────────
const tableUnion = TABLES.join("|");
const TABLE_PATTERN = new RegExp(
  `\\.from\\(\\s*['"](${tableUnion})['"]\\s*\\)\\s*\\.\\s*(select\\s*\\(|insert|update|delete|upsert)\\b`,
);

// Realtime postgres_changes config referencing one of the messaging tables.
// Matches both single- and double-quoted table values, regardless of key order
// within the config object (looks within ~200 chars of `postgres_changes`).
const REALTIME_PATTERN = new RegExp(
  `postgres_changes[\\s\\S]{0,200}?table\\s*:\\s*['"](${tableUnion})['"]`,
);

const STORAGE_LITERAL_PATTERN = new RegExp(
  `storage\\.from\\(\\s*['"]${STORAGE_BUCKET}['"]\\s*\\)`,
);
const STORAGE_CONST_PATTERN = /storage\.from\(\s*CHAT_ATTACHMENTS_BUCKET\s*\)/;

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
    ...scan(source, STORAGE_LITERAL_PATTERN, "storage", 0),
    ...scan(source, STORAGE_CONST_PATTERN, "storage", 0),
  ];

  for (const h of hits) {
    const record = { file: rel, ...h, target: h.target || STORAGE_BUCKET };
    if (isAllowed(rel)) allowedHits.push(record);
    else violations.push(record);
  }
}

const allowedList = [
  ...ALLOWED_DIRS.map((d) => `\`${d}**\``),
  ...[...ALLOWED_FILES].map((f) => `\`${f}\``),
].join(", ");

const summary = `## 🧾 Messaging Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Tables enforced | \`${TABLES.join(", ")}\` |
| Realtime tables enforced | \`${TABLES.join(", ")}\` (postgres_changes) |
| Storage bucket enforced | \`${STORAGE_BUCKET}\` |
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
    `### ❌ Unauthorized direct messaging backend access

| Location | Rule | Target | Snippet |
|----------|------|--------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct messaging access(es).\n   All app access must route through canonical wrappers under:\n     - src/modules/messaging/services/\n     - src/modules/messaging/constants/\n   (useTypingPresence broadcast/presence channel is intentionally out of scope.)\n   Or be added to the explicit allowlist in scripts/messaging-isolation-audit.mjs\n`,
  );
  process.exit(1);
} else {
  const report =
    summary +
    `✅ No unauthorized direct messaging access found. (${allowedHits.length} allowed matches.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}