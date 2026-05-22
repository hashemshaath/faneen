#!/usr/bin/env node
/**
 * Notifications Insert Isolation Audit
 * ─────────────────────────────────────
 * Ensures no application code directly inserts into the `notifications`
 * table outside the shared wrapper at:
 *   src/modules/notifications/services/createNotification.ts
 *
 * Exit 1 if any unauthorized direct insert is found.
 *
 * This is a required passing guardrail. It is wired into CI and must
 * remain green. All notification inserts route through the canonical
 * createNotification wrapper (and createNotificationFireAndForget helper).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const ALLOWED_FILE = "src/modules/notifications/services/createNotification.ts";

// Matches both quote styles and both the `supabase.from(...)` form and the
// chained `.from(...).insert` form. Trailing `.insert` is required to scope
// strictly to writes (reads/updates/deletes are out of scope for this audit).
const PATTERNS = [
  /\.from\(\s*['"]notifications['"]\s*\)\s*\.insert/,
];

const SKIP_DIRS = new Set(["node_modules", "dist", "build", "coverage", ".git", "__tests__"]);
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
      if (!SKIP_EXT.has(ext)) {
        yield full;
      }
    }
  }
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (rel === ALLOWED_FILE) continue;

  const source = fs.readFileSync(file, "utf-8");
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of PATTERNS) {
      if (pattern.test(line)) {
        violations.push({
          file: rel,
          line: i + 1,
          snippet: line.trim().slice(0, 160),
        });
      }
    }
  }
}

const summary = `## 🔔 Notifications Insert Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed wrapper | \`${ALLOWED_FILE}\` |
| Violations found | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map((v) => `| \`${v.file}:${v.line}\` | \`${v.snippet}\` |`)
    .join("\n");

  const report =
    summary +
    `### ❌ Unauthorized direct notification inserts

| Location | Snippet |
|----------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct notification insert(s).\n   All app inserts must route through: ${ALLOWED_FILE}\n`
  );
  process.exit(1);
} else {
  const report = summary + "✅ No unauthorized direct notification inserts found.\n";
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}