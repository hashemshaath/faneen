#!/usr/bin/env node
/**
 * Leads / Quotes Isolation Audit
 * ──────────────────────────────
 * Ensures no application code directly accesses lead/quote backend resources
 * outside the canonical service-layer wrappers.
 *
 * Rules enforced:
 *   1. Direct table access (select/insert/update/delete/upsert) on:
 *        lead_requests, quote_requests, quote_request_files,
 *        quote_request_leads, quote_request_events, quote_request_lead_events
 *   2. Direct RPC invocations of:
 *        create_or_get_lead_conversation,
 *        admin_convert_lead_to_contract,
 *        prepare_contract_prefill_from_lead,
 *        get_contract_source_lead_summary,
 *        link_lead_to_contract
 *   3. Direct edge function invocations of:
 *        submit-quote-request, notify-customer-lead-update,
 *        notify-supplier-lead, admin-reveal-lead-contact,
 *        match-quote-request
 *   4. Direct storage access to bucket `quote-request-files`
 *      (literal string OR `QUOTE_BUCKET` constant).
 *
 * Allowed production paths:
 *   - src/modules/leads/services/**
 *   - src/modules/quotes/services/**
 *   - src/modules/contracts/services/**
 *   - src/lib/quoteRequests.ts                 (canonical signed-URL helper)
 *   - src/modules/leads/constants/storage.ts   (bucket constant)
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
  "src/modules/leads/services/",
  "src/modules/quotes/services/",
  "src/modules/contracts/services/",
];
const ALLOWED_FILES = new Set([
  "src/lib/quoteRequests.ts",
  "src/modules/leads/constants/storage.ts",
]);

const TABLES = [
  "lead_requests",
  "quote_requests",
  "quote_request_files",
  "quote_request_leads",
  "quote_request_events",
  "quote_request_lead_events",
];

const RPCS = [
  "create_or_get_lead_conversation",
  "admin_convert_lead_to_contract",
  "prepare_contract_prefill_from_lead",
  "get_contract_source_lead_summary",
  "link_lead_to_contract",
];

const EDGE_FUNCTIONS = [
  "submit-quote-request",
  "notify-customer-lead-update",
  "notify-supplier-lead",
  "admin-reveal-lead-contact",
  "match-quote-request",
];

const STORAGE_BUCKET = "quote-request-files";

// Patterns ────────────────────────────────────────────────────────────────────
const tableUnion = TABLES.join("|");
const TABLE_PATTERN = new RegExp(
  `\\.from\\(\\s*['"](${tableUnion})['"]\\s*\\)\\s*\\.\\s*(select\\s*\\(|insert|update|delete|upsert)\\b`,
);

const rpcUnion = RPCS.join("|");
const RPC_PATTERN = new RegExp(
  `supabase\\.rpc\\(\\s*['"](${rpcUnion})['"]`,
);

const edgeUnion = EDGE_FUNCTIONS.join("|");
const EDGE_PATTERN = new RegExp(
  `supabase\\.functions\\.invoke\\(\\s*['"](${edgeUnion})['"]`,
);

const STORAGE_LITERAL_PATTERN = new RegExp(
  `storage\\.from\\(\\s*['"]${STORAGE_BUCKET}['"]\\s*\\)`,
);
const STORAGE_CONST_PATTERN = /storage\.from\(\s*QUOTE_BUCKET\s*\)/;

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
    ...scan(source, RPC_PATTERN, "rpc", 1),
    ...scan(source, EDGE_PATTERN, "edge", 1),
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

const summary = `## 🧾 Leads / Quotes Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Tables enforced | \`${TABLES.join(", ")}\` |
| RPCs enforced | \`${RPCS.join(", ")}\` |
| Edge functions enforced | \`${EDGE_FUNCTIONS.join(", ")}\` |
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
    `### ❌ Unauthorized direct lead/quote backend access

| Location | Rule | Target | Snippet |
|----------|------|--------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct lead/quote access(es).\n   All app access must route through canonical wrappers under:\n     - src/modules/leads/services/\n     - src/modules/quotes/services/\n     - src/modules/contracts/services/\n     - src/lib/quoteRequests.ts (signed URL helper)\n   or be added to the explicit allowlist in scripts/leads-quotes-isolation-audit.mjs\n`,
  );
  process.exit(1);
} else {
  const report =
    summary +
    `✅ No unauthorized direct lead/quote access found. (${allowedHits.length} allowed matches.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}