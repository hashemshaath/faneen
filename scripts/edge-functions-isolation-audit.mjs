#!/usr/bin/env node
/**
 * Edge Functions Isolation Audit (EF-6)
 * ─────────────────────────────────────
 * Ensures no application code directly calls `supabase.functions.invoke`
 * (or `*.functions.invoke`) outside the canonical service boundaries
 * established in EF-1 through EF-5.
 *
 * Rules enforced:
 *   1. No `supabase.functions.invoke(...)`, `*.functions.invoke(...)`, or
 *      bare `functions.invoke(...)` outside allowed boundary paths.
 *   2. Allowed paths are the canonical domain wrappers under
 *      `src/modules/<domain>/services/**` plus the auth service.
 *
 * Allowed production paths:
 *   - src/modules/**\/services/**                  canonical domain wrappers
 *   - src/services/auth/authService.ts             canonical OTP/auth caller
 *   - src/integrations/supabase/**                 generated client
 *
 * Skipped:
 *   - __tests__/, *.test.ts, *.test.tsx, *.spec.ts, *.spec.tsx
 *   - src/integrations/supabase/types.ts
 *   - Binary/asset/lockfile/style/markdown/json extensions
 *   - Comment-only lines (// ... or leading * in block comments)
 *
 * Exit 1 on any unauthorized direct invocation.
 * Deterministic filesystem-only scan — no network.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const ALLOWED_DIR_PREFIXES = [
  "src/integrations/supabase/",
];
const ALLOWED_FILES = new Set([
  "src/services/auth/authService.ts",
]);

/**
 * Any file under `src/modules/<domain>/services/` (any depth) is an allowed
 * wrapper home. Module barrels (`src/modules/<x>/index.ts`) are NOT allowed
 * to call invoke directly; they must re-export wrappers.
 */
const MODULE_SERVICES_PATTERN = /^src\/modules\/[^/]+\/services\//;

const INVOKE_PATTERN =
  /(?:(?:[A-Za-z_$][\w$]*\.)?functions\.invoke\s*\()/g;

const SKIP_DIRS = new Set([
  "node_modules", "dist", "build", "coverage", ".git", "__tests__",
]);
const SKIP_EXT = new Set([
  ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico",
  ".woff", ".woff2", ".ttf", ".otf", ".lock", ".css", ".scss",
  ".md", ".mdx", ".json",
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
  if (ALLOWED_DIR_PREFIXES.some((d) => rel.startsWith(d))) return true;
  if (MODULE_SERVICES_PATTERN.test(rel)) return true;
  return false;
}

function isCommentLine(source, index) {
  const lineStart = source.lastIndexOf("\n", index - 1) + 1;
  const lineHead = source.slice(lineStart, index);
  const trimmed = lineHead.replace(/^\s+/, "");
  return (
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*")
  );
}

function extractFunctionName(source, idx) {
  // Look ahead up to 200 chars for the first string literal arg.
  const window = source.slice(idx, idx + 200);
  const m = window.match(/functions\.invoke\s*(?:<[^>]*>)?\s*\(\s*['"]([^'"]+)['"]/);
  return m ? m[1] : "";
}

const violations = [];
const allowedHits = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (SKIP_FILES.has(rel)) continue;
  const source = fs.readFileSync(file, "utf-8");

  const re = new RegExp(INVOKE_PATTERN.source, "g");
  let m;
  while ((m = re.exec(source)) !== null) {
    if (isCommentLine(source, m.index)) continue;
    const line = source.slice(0, m.index).split("\n").length;
    const fnName = extractFunctionName(source, m.index);
    const snippet = source
      .slice(m.index, m.index + 160)
      .replace(/\s+/g, " ")
      .trim();
    const record = { file: rel, line, fnName, snippet };
    if (isAllowed(rel)) allowedHits.push(record);
    else violations.push(record);
  }
}

const allowedList = [
  "`src/modules/**/services/**`",
  ...[...ALLOWED_FILES].map((f) => `\`${f}\``),
  ...ALLOWED_DIR_PREFIXES.map((d) => `\`${d}**\``),
].join(", ");

const summary = `## 🛰️ Edge Functions Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Allowed wrapper invocations | ${allowedHits.length} |
| Violations found | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map(
      (v) =>
        `| \`${v.file}:${v.line}\` | \`${v.fnName || "(unknown)"}\` | \`${v.snippet}\` |`,
    )
    .join("\n");

  const report =
    summary +
    `### ❌ Unauthorized direct edge function invocation

| Location | Function | Snippet |
|----------|----------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct edge function invocation(s).\n   All app invocations must route through canonical wrappers under:\n     - src/modules/<domain>/services/**\n     - src/services/auth/authService.ts\n   See src/modules/edge-functions-boundary.md\n`,
  );
  process.exit(1);
} else {
  const report =
    summary +
    `✅ No unauthorized direct edge function invocations found. (${allowedHits.length} allowed wrapper calls.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}