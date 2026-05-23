#!/usr/bin/env node
/**
 * Profiles Isolation Audit
 * ────────────────────────
 * Ensures no application code directly accesses the `profiles` table
 * outside the canonical service-layer wrappers.
 *
 * Allowed direct access (production):
 *   - src/modules/users/services/**       (canonical profile wrappers)
 *
 * Test files (`__tests__/`, `.test.ts`, `.test.tsx`) are skipped because
 * regression/migration tests intentionally reference the literal string.
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

const ALLOWED_DIRS = ["src/modules/users/services/"];
const ALLOWED_FILES = new Set();

// Match `.from('profiles')` and `.from("profiles")` (covers both the
// `supabase.from(...)` form and any chained `.from(...)` form).
const PATTERN = /\.from\(\s*['"]profiles['"]\s*\)/;

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

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (isAllowed(rel)) continue;

  const source = fs.readFileSync(file, "utf-8");
  const lines = source.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (PATTERN.test(lines[i])) {
      violations.push({
        file: rel,
        line: i + 1,
        snippet: lines[i].trim().slice(0, 160),
      });
    }
  }
}

const allowedList = [
  ...ALLOWED_DIRS.map((d) => `\`${d}**\``),
  ...[...ALLOWED_FILES].map((f) => `\`${f}\``),
].join(", ");

const summary = `## 👤 Profiles Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Violations found | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map((v) => `| \`${v.file}:${v.line}\` | \`${v.snippet}\` |`)
    .join("\n");

  const report =
    summary +
    `### ❌ Unauthorized direct profile table access

| Location | Snippet |
|----------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct \`profiles\` access(es).\n   All app access must route through canonical wrappers under: src/modules/users/services/\n`
  );
  process.exit(1);
} else {
  const report = summary + "✅ No unauthorized direct profile access found.\n";
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}