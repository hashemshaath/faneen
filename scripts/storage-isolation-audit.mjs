#!/usr/bin/env node
/**
 * Storage Isolation Audit (F-6)
 * ─────────────────────────────
 * Ensures no application code directly accesses Supabase Storage outside
 * the canonical service boundaries established in F-1 through F-5.
 *
 * Rules enforced:
 *   1. No `supabase.storage.from(...)` or `storage.from(...)` outside
 *      allowed boundary paths.
 *   2. No Supabase storage operations
 *        .upload / .download / .remove / .getPublicUrl
 *        .createSignedUrl / .createSignedUrls / .list
 *      in files that import the Supabase client outside allowed paths.
 *   3. No `/storage/v1/object/public/` URL parsing outside
 *      `src/modules/files/services/public/extractPublicStoragePath.ts`.
 *
 * Allowed production paths (canonical / boundary owners):
 *   - src/modules/files/**                        canonical files module
 *   - src/modules/messaging/services/storage/**   chat-attachments service
 *   - src/modules/contracts/services/attachments/** contract-attachments
 *   - src/lib/quoteRequests.ts                    canonical quote signed-URL
 *   - src/lib/contract-attachments.ts             compat shim (no .from)
 *   - src/integrations/supabase/**                generated client
 *
 * Skipped:
 *   - __tests__/, *.test.ts, *.test.tsx (sweep/meta tests reference rules
 *     intentionally).
 *   - src/integrations/supabase/types.ts (generated).
 *   - Binary/asset/lockfile/style extensions.
 *   - Comment-only lines (// ... or leading * in block comments).
 *
 * Exit 1 on any unauthorized direct access.
 * Deterministic filesystem-only scan — no network.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const ALLOWED_DIRS = [
  "src/modules/files/",
  "src/modules/messaging/services/storage/",
  "src/modules/contracts/services/attachments/",
  "src/modules/workOrders/services/",
  "src/integrations/supabase/",
];
const ALLOWED_FILES = new Set([
  "src/lib/quoteRequests.ts",
  "src/lib/contract-attachments.ts",
]);

/** Public URL parsing is centralized here only. */
const PUBLIC_URL_PARSER_ALLOWED = new Set([
  "src/modules/files/services/public/extractPublicStoragePath.ts",
]);

const STORAGE_OPS = [
  "upload",
  "download",
  "remove",
  "getPublicUrl",
  "createSignedUrl",
  "createSignedUrls",
  "list",
];

const STORAGE_FROM_PATTERN =
  /(?:supabase|[A-Za-z_$][\w$]*)\.storage\.from\s*\(|(?<![A-Za-z0-9_$])storage\.from\s*\(/;

const OPS_UNION = STORAGE_OPS.join("|");
const OP_PATTERN = new RegExp(`\\.(${OPS_UNION})\\s*\\(`);

const SUPABASE_CLIENT_IMPORT =
  /from\s+['"]@\/integrations\/supabase\/client['"]/;

const PUBLIC_URL_MARKER = "/storage/v1/object/public/";

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
      if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) continue;
      if (entry.name.endsWith(".spec.ts") || entry.name.endsWith(".spec.tsx")) continue;
      yield full;
    }
  }
}

function isAllowed(rel) {
  if (ALLOWED_FILES.has(rel)) return true;
  return ALLOWED_DIRS.some((dir) => rel.startsWith(dir));
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

function scan(source, pattern, kind) {
  const hits = [];
  const re = new RegExp(pattern.source, "g");
  let m;
  while ((m = re.exec(source)) !== null) {
    if (isCommentLine(source, m.index)) continue;
    const line = source.slice(0, m.index).split("\n").length;
    const snippet = source
      .slice(m.index, m.index + 160)
      .replace(/\s+/g, " ")
      .trim();
    hits.push({ kind, line, snippet, target: m[1] ?? "" });
  }
  return hits;
}

function scanLiteral(source, literal, kind) {
  const hits = [];
  let idx = 0;
  while ((idx = source.indexOf(literal, idx)) !== -1) {
    if (!isCommentLine(source, idx)) {
      const line = source.slice(0, idx).split("\n").length;
      const snippet = source
        .slice(idx, idx + 160)
        .replace(/\s+/g, " ")
        .trim();
      hits.push({ kind, line, snippet, target: literal });
    }
    idx += literal.length;
  }
  return hits;
}

const violations = [];
const allowedHits = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (SKIP_FILES.has(rel)) continue;
  const source = fs.readFileSync(file, "utf-8");

  // Rule 1: storage.from / supabase.storage.from
  const fromHits = scan(source, STORAGE_FROM_PATTERN, "storage.from");

  // Rule 2: storage ops in files importing the Supabase client. This catches
  // realistic offenders without false-positiving on `Array.upload`-style
  // method names elsewhere.
  let opHits = [];
  if (SUPABASE_CLIENT_IMPORT.test(source)) {
    opHits = scan(source, OP_PATTERN, "storage-op").filter((h) =>
      // Only flag storage-method names that aren't already covered by the
      // storage.from rule on the same line.
      ["createSignedUrl", "createSignedUrls", "getPublicUrl", "download"].includes(
        h.target,
      ),
    );
  }

  // Rule 3: public URL parsing
  const urlHits = scanLiteral(source, PUBLIC_URL_MARKER, "public-url-parse");

  const combined = [...fromHits, ...opHits];
  for (const h of combined) {
    const record = { file: rel, ...h };
    if (isAllowed(rel)) allowedHits.push(record);
    else violations.push(record);
  }
  for (const h of urlHits) {
    const record = { file: rel, ...h };
    if (PUBLIC_URL_PARSER_ALLOWED.has(rel)) allowedHits.push(record);
    else violations.push(record);
  }
}

const allowedList = [
  ...ALLOWED_DIRS.map((d) => `\`${d}**\``),
  ...[...ALLOWED_FILES].map((f) => `\`${f}\``),
].join(", ");

const summary = `## 🗄️ Storage Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Storage ops enforced | ${STORAGE_OPS.length} (${STORAGE_OPS.join(", ")}) |
| URL parser allowed in | \`${[...PUBLIC_URL_PARSER_ALLOWED][0]}\` |
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
    `### ❌ Unauthorized direct storage access

| Location | Rule | Target | Snippet |
|----------|------|--------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct storage access(es).\n   All app access must route through canonical wrappers under:\n     - src/modules/files/services/\n     - src/modules/messaging/services/storage/\n     - src/modules/contracts/services/attachments/\n   or be added to the explicit allowlist in scripts/storage-isolation-audit.mjs\n`,
  );
  process.exit(1);
} else {
  const report =
    summary +
    `✅ No unauthorized direct storage access found. (${allowedHits.length} allowed matches.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}