#!/usr/bin/env node
/**
 * R4E-3 — Businesses Sensitive Fields Isolation Audit
 * ────────────────────────────────────────────────────
 * Forbids the generic `updateBusinessById` / `updateBusinessesByIds`
 * wrappers from carrying any of the following sensitive columns in their
 * `values` argument anywhere in `src/`:
 *
 *   - is_active
 *   - is_verified
 *   - is_demo
 *   - approval_status
 *   - user_id
 *
 * These columns must be written exclusively through the guarded wrappers in
 * `src/modules/businesses/services/guardedMutations.ts` (which themselves
 * call the canonical updaters with a tightly-scoped single-field values bag).
 *
 * `membership_tier` is governed by `memberships-isolation-audit.mjs` —
 * intentionally NOT covered here.
 *
 * Allowed files:
 *   - src/modules/businesses/services/guardedMutations.ts
 *   - test files (`__tests__/`, `.test.ts`, `.test.tsx`)
 *
 * Exit 1 if any violation is found.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const ALLOWED_FILES = new Set([
  "src/modules/businesses/services/guardedMutations.ts",
]);

const FORBIDDEN_FIELDS = ["is_active", "is_verified", "is_demo", "approval_status", "user_id"];

// Match a call to updateBusinessById( ... ) or updateBusinessesByIds( ... )
// across newlines, capturing the argument blob (non-greedy, stops at the
// closing paren of a balanced-ish call — good enough for our codebase style).
const CALL_RE = /\b(updateBusinessById|updateBusinessesByIds)\s*\(([\s\S]*?)\)\s*[;,)]/g;

const SKIP_DIRS = new Set([
  "node_modules", "dist", "build", "coverage", ".git",
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
      yield full;
    }
  }
}

function isTestFile(rel) {
  return (
    rel.includes("/__tests__/") ||
    rel.endsWith(".test.ts") ||
    rel.endsWith(".test.tsx")
  );
}

function isAllowed(rel) {
  if (ALLOWED_FILES.has(rel)) return true;
  if (isTestFile(rel)) return true;
  return false;
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).replace(/\\/g, "/");
  if (isAllowed(rel)) continue;

  const source = fs.readFileSync(file, "utf-8");
  if (!source.includes("updateBusinessById") && !source.includes("updateBusinessesByIds")) {
    continue;
  }

  CALL_RE.lastIndex = 0;
  let m;
  while ((m = CALL_RE.exec(source)) !== null) {
    const callName = m[1];
    const args = m[2];
    for (const field of FORBIDDEN_FIELDS) {
      // Match the field as an object key (`is_active:` or `[is_active]:`) or
      // shorthand (`is_active,` / `is_active }`). Avoid matching it inside an
      // unrelated identifier like `setIsActive`.
      const fieldRe = new RegExp(`(^|[\\s,{\\[])${field}\\s*[:,}]`, "m");
      if (fieldRe.test(args)) {
        const upto = source.slice(0, m.index);
        const line = upto.split("\n").length;
        violations.push({
          file: rel,
          line,
          call: callName,
          field,
          snippet: args.replace(/\s+/g, " ").trim().slice(0, 160),
        });
      }
    }
  }
}

const allowedList = [...ALLOWED_FILES].map((f) => `\`${f}\``).join(", ");

const summary = `## 🛡️ Businesses Sensitive Fields Isolation Audit

| Metric | Value |
|--------|-------|
| Allowed paths | ${allowedList} (+ test files) |
| Forbidden fields | ${FORBIDDEN_FIELDS.map((f) => `\`${f}\``).join(", ")} |
| Calls audited | \`updateBusinessById\`, \`updateBusinessesByIds\` |
| Violations found | ${violations.length} |

`;

if (violations.length > 0) {
  const table = violations
    .map((v) => `| \`${v.file}:${v.line}\` | \`${v.call}\` | \`${v.field}\` | \`${v.snippet}\` |`)
    .join("\n");

  const report =
    summary +
    `### ❌ Sensitive fields leaking through generic business updaters

| Location | Call | Field | Snippet |
|----------|------|-------|---------|
${table}

Move these writes into \`src/modules/businesses/services/guardedMutations.ts\`
(setBusinessActive / setBusinessVerified / bulkSetBusinessesActive /
bulkSetBusinessesVerified) so that sensitive columns can never travel through
a generic bag.
`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.error(report);
  process.exit(1);
} else {
  const report = summary + "✅ No sensitive-field leaks through generic business updaters.\n";
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
  }
  console.log(report);
}