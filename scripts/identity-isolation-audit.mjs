#!/usr/bin/env node
/**
 * Identity Isolation Audit (ID-6)
 * ───────────────────────────────
 * Ensures no application code directly accesses identity / roles / auth
 * backend resources outside the canonical service boundaries established
 * in phases ID-1 through ID-5.
 *
 * Rules enforced:
 *   1. Direct table access (select/insert/update/delete/upsert) on:
 *        user_roles, password_reset_log
 *   2. Direct RPC invocations of identity SECURITY DEFINER RPCs:
 *        has_role, accept_client_invitation,
 *        get_staff_invitation_preview, accept_staff_invitation,
 *        get_my_staff_invitations
 *   3. Direct edge function invocations of identity edge functions:
 *        admin-reset-password, admin-delete-user, temp-code-session
 *   4. Direct supabase.auth.* client calls:
 *        signOut, getSession, getUser, updateUser, verifyOtp,
 *        signInWithPassword, signUp, resetPasswordForEmail, setSession
 *
 * Allowed production paths (canonical / boundary owners):
 *   - src/modules/identity/**          canonical identity services
 *   - src/services/auth/**             canonical low-level auth service
 *   - src/contexts/AuthContext.tsx     central session owner
 *   - src/integrations/lovable/**      OAuth bridge (setSession boundary)
 *   - src/services/userRoles.ts        compatibility shim (re-exports only)
 *
 * Skipped:
 *   - __tests__/, *.test.ts, *.test.tsx (RLS/security tests may access
 *     restricted tables intentionally).
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
  "src/modules/identity/",
  "src/services/auth/",
  "src/integrations/lovable/",
];
const ALLOWED_FILES = new Set([
  "src/contexts/AuthContext.tsx",
  "src/services/userRoles.ts",
]);

const TABLES = ["user_roles", "password_reset_log"];
const RPCS = [
  "has_role",
  "accept_client_invitation",
  "get_staff_invitation_preview",
  "accept_staff_invitation",
  "get_my_staff_invitations",
];
const EDGE_FUNCTIONS = [
  "admin-reset-password",
  "admin-delete-user",
  "temp-code-session",
];
const AUTH_METHODS = [
  "signOut",
  "getSession",
  "getUser",
  "updateUser",
  "verifyOtp",
  "signInWithPassword",
  "signUp",
  "resetPasswordForEmail",
  "setSession",
];

const tableUnion = TABLES.join("|");
const TABLE_PATTERN = new RegExp(
  `\\.from\\(\\s*['"](${tableUnion})['"]\\s*\\)\\s*\\.\\s*(select\\s*\\(|insert|update|delete|upsert)\\b`,
);

const rpcUnion = RPCS.join("|");
const RPC_PATTERN = new RegExp(`\\.rpc\\(\\s*['"](${rpcUnion})['"]`);

const edgeUnion = EDGE_FUNCTIONS.join("|");
const EDGE_PATTERN = new RegExp(
  `\\.functions\\.invoke\\(\\s*['"](${edgeUnion})['"]`,
);

const authUnion = AUTH_METHODS.join("|");
const AUTH_PATTERN = new RegExp(
  `supabase\\.auth\\.(${authUnion})\\s*\\(`,
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

function isCommentLine(source, index) {
  const lineStart = source.lastIndexOf("\n", index - 1) + 1;
  const lineHead = source.slice(lineStart, index);
  // Trim leading whitespace then check for // or * (JSDoc) or /*
  const trimmed = lineHead.replace(/^\s+/, "");
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
}

function scan(source, pattern, kind, captureGroup = 1) {
  const hits = [];
  const re = new RegExp(pattern.source, "g");
  let m;
  while ((m = re.exec(source)) !== null) {
    if (isCommentLine(source, m.index)) continue;
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
    ...scan(source, AUTH_PATTERN, "auth", 1),
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

const summary = `## 🛡️ Identity Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} |
| Tables enforced | ${TABLES.length} (${TABLES.join(", ")}) |
| RPCs enforced | ${RPCS.length} |
| Edge functions enforced | ${EDGE_FUNCTIONS.length} |
| Auth methods enforced | ${AUTH_METHODS.length} |
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
    `### ❌ Unauthorized direct identity/auth/roles access

| Location | Rule | Target | Snippet |
|----------|------|--------|---------|
${table}
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  console.error(
    `\n❌ Found ${violations.length} unauthorized direct identity access(es).\n   All app access must route through canonical wrappers under:\n     - src/modules/identity/services/\n   or be added to the explicit allowlist in scripts/identity-isolation-audit.mjs\n`,
  );
  process.exit(1);
} else {
  const report =
    summary +
    `✅ No unauthorized direct identity access found. (${allowedHits.length} allowed matches.)\n`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}