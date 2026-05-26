#!/usr/bin/env node
/**
 * Catalog Isolation Audit (CAT-6)
 * ───────────────────────────────
 * Ensures no application code directly reads/writes catalog tables
 * outside the canonical catalog service-layer wrappers and a small set
 * of explicitly allowlisted files.
 *
 * Guarded tables (reads + writes):
 *   - business_services
 *   - business_service_areas
 *   - business_branches
 *   - business_availability
 *   - business_bnpl_providers
 *   - bnpl_providers
 *   - warranties
 *
 * Allowed production paths:
 *   - src/modules/catalog/services/**
 *   - src/modules/contracts/services/aggregates.ts
 *     (contracts-owned warranties aggregate read; intentionally allowed)
 *
 * Test files (`__tests__/`, `*.test.ts`, `*.test.tsx`) are skipped.
 * Exit 1 if any unauthorized direct catalog access is found.
 * Deterministic filesystem-only scan. No network.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const TABLES = [
  "business_services",
  "business_service_areas",
  "business_branches",
  "business_availability",
  "business_bnpl_providers",
  "bnpl_providers",
  "warranties",
];

const ALLOWED_DIRS = [
  "src/modules/catalog/services/",
  // WORKSPACE-CONTEXT-2: read-only RLS-scoped workspace location wrappers.
  "src/modules/locations/services/workspace/",
];
const ALLOWED_FILES = new Set([
  "src/modules/contracts/services/aggregates.ts",
]);

const TABLE_ALT = TABLES.join("|");
const PATTERN = new RegExp(
  `\\.from\\(\\s*['"](${TABLE_ALT})['"]\\s*\\)`,
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
const allowedHits = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  const source = fs.readFileSync(file, "utf-8");
  if (!PATTERN.test(source)) continue;

  const globalRe = new RegExp(PATTERN.source, "g");
  let m;
  while ((m = globalRe.exec(source)) !== null) {
    const upto = source.slice(0, m.index);
    const line = upto.split("\n").length;
    const snippet = source
      .slice(m.index, m.index + 160)
      .replace(/\s+/g, " ")
      .trim();
    const table = m[1];
    const record = { file: rel, line, table, snippet };
    if (isAllowed(rel)) allowedHits.push(record);
    else violations.push(record);
  }
}

const allowedList = [
  ...ALLOWED_DIRS.map((d) => `\`${d}**\``),
  ...[...ALLOWED_FILES].map((f) => `\`${f}\``),
].join(", ");

const summary = `## 📚 Catalog Isolation Audit

| Metric | Value |
|--------|-------|
| Tables guarded | ${TABLES.map((t) => `\`${t}\``).join(", ")} |
| Allowed paths | ${allowedList} |
| Pattern enforced | \`.from('<catalog_table>')\` (reads + writes) |
| Allowed matches | ${allowedHits.length} |
| Violations found | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map((v) => `| \`${v.file}:${v.line}\` | \`${v.table}\` | \`${v.snippet}\` |`)
    .join("\n");

  const report =
    summary +
    `### ❌ Unauthorized direct catalog table access

| Location | Table | Snippet |
|----------|-------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct catalog access(es).\n   All app catalog access must route through canonical wrappers under: src/modules/catalog/services/\n   or be added to the explicit allowlist in scripts/catalog-isolation-audit.mjs\n`
  );
  process.exit(1);
} else {
  const report = summary + `✅ No unauthorized direct catalog access found. (${allowedHits.length} allowed matches.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}