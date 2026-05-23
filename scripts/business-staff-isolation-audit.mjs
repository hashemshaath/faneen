#!/usr/bin/env node
/**
 * Business Staff Isolation Audit
 * ────────────────────────────────
 * Ensures no application code directly accesses the `business_staff` table
 * outside the canonical service-layer wrappers.
 *
 * Operations enforced (whitespace/newline tolerant):
 *   .from('business_staff') ... .select(
 *   .from('business_staff') ... .insert
 *   .from('business_staff') ... .update
 *   .from('business_staff') ... .delete
 *   .from('business_staff') ... .upsert
 *
 * Allowed production paths:
 *   - src/modules/businesses/services/**
 *
 * RPC usage (e.g. get_business_staff_with_profiles) is intentionally out of
 * scope — this guardrail targets direct table access only.
 *
 * Test files (`__tests__/`, `.test.ts`, `.test.tsx`) are skipped because
 * regression/migration tests intentionally reference the literal pattern.
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

const ALLOWED_DIRS = ["src/modules/businesses/services/"];
const ALLOWED_FILES = new Set();

// Match .from('business_staff').<op> where op ∈ {select, insert, update, delete, upsert}.
// select requires the opening '(' to avoid matching other unrelated methods.
const PATTERN =
  /\.from\(\s*['"]business_staff['"]\s*\)\s*\.\s*(select\s*\(|insert|update|delete|upsert)\b/;

// R4E-3: forbid direct use of the canonical low-level staff wrappers
// (updateBusinessStaffById / deleteBusinessStaffById) outside the guarded
// staff mutation module. insertBusinessStaff remains allowed everywhere.
const WRAPPER_PATTERN = /\b(updateBusinessStaffById|deleteBusinessStaffById)\s*\(/;
const WRAPPER_ALLOWED_FILES = new Set([
  "src/modules/businesses/services/guardedStaffMutations.ts",
]);

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

function isWrapperAllowed(rel) {
  if (WRAPPER_ALLOWED_FILES.has(rel)) return true;
  // Service files that define / re-export the wrappers themselves.
  return rel.startsWith("src/modules/businesses/services/");
}

const violations = [];
const allowedHits = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf-8");
  if (PATTERN.test(source)) {
    const globalRe = new RegExp(PATTERN.source, "g");
    let m;
    while ((m = globalRe.exec(source)) !== null) {
      const upto = source.slice(0, m.index);
      const line = upto.split("\n").length;
      const op = m[1].startsWith("select") ? "select" : m[1];
      const snippet = source
        .slice(m.index, m.index + 160)
        .replace(/\s+/g, " ")
        .trim();
      const record = { file: rel, line, op, snippet };
      if (isAllowed(rel)) allowedHits.push(record);
      else violations.push(record);
    }
  }

  // R4E-3: wrapper isolation — forbid updateBusinessStaffById /
  // deleteBusinessStaffById outside guardedStaffMutations.ts (and the
  // service module itself). insertBusinessStaff is intentionally unrestricted.
  if (WRAPPER_PATTERN.test(source) && !isWrapperAllowed(rel)) {
    const globalRe = new RegExp(WRAPPER_PATTERN.source, "g");
    let m;
    while ((m = globalRe.exec(source)) !== null) {
      const upto = source.slice(0, m.index);
      const line = upto.split("\n").length;
      const snippet = source
        .slice(m.index, m.index + 160)
        .replace(/\s+/g, " ")
        .trim();
      violations.push({ file: rel, line, op: `wrapper:${m[1]}`, snippet });
    }
  }
}

const allowedList = [
  ...ALLOWED_DIRS.map((d) => `\`${d}**\``),
  ...[...ALLOWED_FILES].map((f) => `\`${f}\``),
].join(", ");

const summary = `## 👤 Business Staff Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Pattern enforced | \`.from('business_staff')...{select|insert|update|delete|upsert}\` |
| Allowed matches | ${allowedHits.length} |
| Violations found | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map((v) => `| \`${v.file}:${v.line}\` | \`${v.op}\` | \`${v.snippet}\` |`)
    .join("\n");

  const report =
    summary +
    `### ❌ Unauthorized direct business_staff table access

| Location | Op | Snippet |
|----------|----|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct \`business_staff\` access(es).\n   All app access must route through canonical wrappers under: src/modules/businesses/services/\n   or be added to the explicit allowlist in scripts/business-staff-isolation-audit.mjs\n`
  );
  process.exit(1);
} else {
  const report = summary + `✅ No unauthorized direct business_staff access found. (${allowedHits.length} allowed matches.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}
