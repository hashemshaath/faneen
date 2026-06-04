#!/usr/bin/env node
// DATA-ENRICHMENT-GOVERNANCE-1 — forbid direct calls to
// `data-enrichment-*` edge functions outside the module wrappers.
import { readFileSync } from "node:fs";
import { globSync } from "glob";

const ALLOWED_DIRS = [
  "src/modules/dataEnrichment/",
  "supabase/functions/",
  "src/tests/dataEnrichmentGovernance1.test.ts",
];

const files = globSync("src/**/*.{ts,tsx}", { nodir: true });
const offenders = [];
const re = /functions\.invoke\(['"`]data-enrichment-/;

for (const f of files) {
  if (ALLOWED_DIRS.some((d) => f.startsWith(d))) continue;
  const src = readFileSync(f, "utf8");
  if (re.test(src)) offenders.push(f);
}

if (offenders.length) {
  console.error("Data enrichment isolation violations:");
  offenders.forEach((f) => console.error("  - " + f));
  process.exit(1);
}
console.log("data-enrichment isolation: OK (" + files.length + " files scanned)");