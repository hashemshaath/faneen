#!/usr/bin/env node
/**
 * Contracts Isolation Audit (CT-13)
 * ─────────────────────────────────
 * Ensures no application code directly accesses contract-domain backend
 * resources outside the canonical service-layer wrappers established in
 * phases CT-1 through CT-12.
 *
 * Rules enforced:
 *   1. Direct table access (select/insert/update/delete/upsert) on any
 *      contract-domain table (contracts, contract_*, installment_*).
 *   2. Direct storage access on the `contract-attachments` bucket
 *      (literal string or `CONTRACT_ATTACHMENTS_BUCKET` constant).
 *   3. Direct RPC invocations of contract-domain SECURITY DEFINER RPCs.
 *
 * Allowed production paths:
 *   - src/modules/contracts/**            (services + barrel)
 *   - src/modules/leads/services/conversion.ts
 *       (intentional service-layer post-conversion contracts.select)
 *
 * Test files (`__tests__/`, `.test.ts`, `.test.tsx`), the generated
 * Supabase types file, binaries, styles, and lockfiles are skipped.
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
  "src/modules/contracts/",
];
const ALLOWED_FILES = new Set([
  // Intentional exception: read-only post-conversion contract lookup
  // already living in the leads service layer. Governed by the
  // leads-quotes-isolation-audit; kept here as a documented allowlist.
  "src/modules/leads/services/conversion.ts",
  // BUSINESS-OPERATIONS-2F: read-only SLA candidate fetcher for
  // contracts pending signature. Selects only id/created_at/status/
  // provider_id/client_id/provider_accepted_at/client_accepted_at.
  // No PII (no titles, descriptions, terms, addresses, or amounts).
  "src/modules/operations/services/productionFetchers.ts",
]);

const TABLES = [
  "contracts",
  "contract_attachments",
  "contract_milestones",
  "contract_notes",
  "contract_measurements",
  "contract_templates",
  "contract_template_versions",
  "contract_template_sections",
  "contract_template_clauses",
  "contract_template_pricing_rules",
  "contract_template_required_fields",
  "contract_template_attachments",
  "contract_signatures",
  "contract_events",
  "contract_audit_logs",
  "installment_plans",
  "installment_payments",
];

const RPCS = [
  "update_contract_draft_autosave",
  "search_contract_clients",
  "quick_resolve_contract_client",
  "list_client_sites_for_contract",
  "create_contract_from_template",
  "verify_contract_public",
  "recalc_contract_total",
  "get_contract_analytics_dashboard",
  "get_admin_contract_analytics_dashboard",
  "record_contract_pdf_export",
  "list_contract_pdf_exports",
  "admin_list_contract_pdf_exports",
  "admin_contract_pdf_exports_summary",
  "accept_contract",
  "send_contract_for_approval",
  "clone_contract_as_draft",
  "set_contract_execution_site",
  "link_lead_to_contract",
  "complete_contract_from_invitation",
  "prepare_contract_prefill_from_lead",
  "get_contract_source_lead_summary",
  "approve_contract_amendment",
  "reject_contract_amendment",
  "cancel_contract_amendment",
  "apply_contract_amendment",
];

const STORAGE_BUCKET = "contract-attachments";
const STORAGE_CONST = "CONTRACT_ATTACHMENTS_BUCKET";

// Patterns ────────────────────────────────────────────────────────────────────
const tableUnion = TABLES.join("|");
const TABLE_PATTERN = new RegExp(
  `\\.from\\(\\s*['"](${tableUnion})['"]\\s*\\)\\s*\\.\\s*(select\\s*\\(|insert|update|delete|upsert)\\b`,
);

const rpcUnion = RPCS.join("|");
const RPC_PATTERN = new RegExp(
  `\\.rpc\\(\\s*['"](${rpcUnion})['"]`,
);

const STORAGE_LITERAL_PATTERN = new RegExp(
  `storage\\.from\\(\\s*['"]${STORAGE_BUCKET}['"]\\s*\\)`,
);
const STORAGE_CONST_PATTERN = new RegExp(
  `storage\\.from\\(\\s*${STORAGE_CONST}\\s*\\)`,
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
    ...scan(source, RPC_PATTERN, "rpc", 1),
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

const summary = `## 📜 Contracts Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Tables enforced | ${TABLES.length} |
| RPCs enforced | ${RPCS.length} |
| Storage bucket enforced | \`${STORAGE_BUCKET}\` (+ \`${STORAGE_CONST}\`) |
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
    `### ❌ Unauthorized direct contract-domain backend access

| Location | Rule | Target | Snippet |
|----------|------|--------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct contract-domain access(es).\n   All app access must route through canonical wrappers under:\n     - src/modules/contracts/services/\n   or be added to the explicit allowlist in scripts/contracts-isolation-audit.mjs\n`,
  );
  process.exit(1);
} else {
  const report =
    summary +
    `✅ No unauthorized direct contract-domain access found. (${allowedHits.length} allowed matches.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}