#!/usr/bin/env node
/**
 * JSON-LD Snapshot Audit
 * ──────────────────────
 * Compares JSON-LD structures found in source code against
 * expected "snapshot" fixtures to detect regressions:
 *   - Missing expected @type blocks
 *   - Missing required fields within each block
 *   - Missing nested typed objects
 *
 * Fixtures live in scripts/jsonld-snapshots/index.json
 * Exit 1 on any mismatch.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES_PATH = path.join(ROOT, "scripts", "jsonld-snapshots", "index.json");

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};

/* ── helpers ── */

function read(rel) {
  const abs = path.join(ROOT, rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf-8") : null;
}

/**
 * Extract all @type values declared in a source file.
 * Returns Set of type names.
 */
function extractTypes(source) {
  const types = new Set();
  const re = /['"]@type['"]\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source)) !== null) types.add(m[1]);
  return types;
}

/**
 * Check if a field name (possibly nested via dot/bracket) exists in source.
 * We look for the key as a JS object property.
 */
function hasField(source, field) {
  // Strip array suffix for pattern matching
  const clean = field.replace(/\[\]$/, "");
  const re = new RegExp(`['"]?${clean}['"]?\\s*:`);
  return re.test(source);
}

/**
 * Recursively validate nested type requirements.
 * Returns array of error strings.
 */
function validateNestedTypes(source, nestedTypes, parentType) {
  const errors = [];
  if (!nestedTypes) return errors;

  for (const [fieldName, spec] of Object.entries(nestedTypes)) {
    const clean = fieldName.replace(/\[\]$/, "");

    // Check nested @type exists
    if (spec["@type"]) {
      const typePresent = extractTypes(source).has(spec["@type"]);
      if (!typePresent) {
        errors.push(`${parentType} → ${clean}: missing nested @type "${spec["@type"]}"`);
      }
    }

    // Check nested required fields
    if (spec.requiredFields) {
      for (const rf of spec.requiredFields) {
        if (!hasField(source, rf)) {
          errors.push(`${parentType} → ${clean}: missing required field "${rf}"`);
        }
      }
    }

    // Recurse deeper
    if (spec.nestedTypes) {
      errors.push(...validateNestedTypes(source, spec.nestedTypes, `${parentType}.${clean}`));
    }
  }
  return errors;
}

/* ── main ── */

console.log(`\n${c.bold}${c.cyan}📸 JSON-LD Snapshot Audit${c.reset}\n`);

if (!fs.existsSync(FIXTURES_PATH)) {
  console.log(`${c.red}✗ Fixtures file not found: ${FIXTURES_PATH}${c.reset}`);
  process.exit(1);
}

const fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, "utf-8"));
const results = [];
let totalPassed = 0;
let totalFailed = 0;

for (const [filePath, expectedBlocks] of Object.entries(fixtures)) {
  const source = read(filePath);
  const relFile = filePath;

  console.log(`${c.bold}${relFile}:${c.reset}`);

  if (!source) {
    console.log(`  ${c.red}✗${c.reset} File not found`);
    results.push({ file: relFile, check: "file exists", pass: false });
    totalFailed++;
    continue;
  }

  const foundTypes = extractTypes(source);

  for (const block of expectedBlocks) {
    const expectedType = block["@type"];

    // 1. Check @type presence
    if (!foundTypes.has(expectedType)) {
      console.log(`  ${c.red}✗${c.reset} Missing @type "${expectedType}"`);
      results.push({ file: relFile, check: `@type ${expectedType}`, pass: false });
      totalFailed++;
      continue;
    }

    console.log(`  ${c.green}✓${c.reset} @type "${expectedType}" present`);
    results.push({ file: relFile, check: `@type ${expectedType}`, pass: true });
    totalPassed++;

    // 2. Check required fields
    const reqFields = block.requiredFields || [];
    for (const rf of reqFields) {
      if (rf === "@context" || rf === "@type") continue; // already checked
      const present = hasField(source, rf);
      if (present) {
        console.log(`    ${c.green}✓${c.reset} ${expectedType}.${rf}`);
        results.push({ file: relFile, check: `${expectedType}.${rf}`, pass: true });
        totalPassed++;
      } else {
        console.log(`    ${c.red}✗${c.reset} ${expectedType}.${rf} — MISSING`);
        results.push({ file: relFile, check: `${expectedType}.${rf}`, pass: false });
        totalFailed++;
      }
    }

    // 3. Check nested types
    if (block.nestedTypes) {
      const nestedErrors = validateNestedTypes(source, block.nestedTypes, expectedType);
      if (nestedErrors.length === 0) {
        const nestedCount = Object.keys(block.nestedTypes).length;
        console.log(`    ${c.green}✓${c.reset} All ${nestedCount} nested type(s) valid`);
        results.push({ file: relFile, check: `${expectedType} nested types`, pass: true });
        totalPassed++;
      } else {
        for (const err of nestedErrors) {
          console.log(`    ${c.red}✗${c.reset} ${err}`);
          results.push({ file: relFile, check: err, pass: false });
          totalFailed++;
        }
      }
    }
  }

  console.log("");
}

/* ── Summary ── */

const total = totalPassed + totalFailed;
console.log(`${c.bold}${"═".repeat(55)}${c.reset}`);
console.log(`  Fixtures: ${Object.keys(fixtures).length} files, ${Object.values(fixtures).flat().length} schema blocks`);
console.log(`  Checks:   ${total} total`);
console.log(`  ${c.green}Passed:  ${totalPassed}${c.reset}`);
if (totalFailed > 0) console.log(`  ${c.red}Failed:  ${totalFailed}${c.reset}`);

// GitHub Actions summary
if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = totalFailed > 0 ? "❌" : "✅";
  let md = `## ${icon} JSON-LD Snapshot Audit\n\n`;
  md += `| File | Check | Status |\n|---|---|---|\n`;
  for (const r of results) {
    md += `| ${r.file} | ${r.check} | ${r.pass ? "✅" : "❌"} |\n`;
  }
  md += `\n**${totalPassed}** passed, **${totalFailed}** failed out of **${total}** checks.\n`;
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (totalFailed > 0) {
  console.log(`\n${c.red}${c.bold}❌ JSON-LD snapshot mismatches detected — merge blocked${c.reset}\n`);
  process.exit(1);
} else {
  console.log(`\n${c.green}${c.bold}✅ All JSON-LD snapshots match${c.reset}\n`);
  process.exit(0);
}