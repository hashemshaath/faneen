#!/usr/bin/env node
/**
 * JSON-LD Parse & Validation Audit
 * ─────────────────────────────────
 * Extracts JSON-LD objects from source code, parses them,
 * and fails if JSON is invalid or missing @context / @type.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};

/**
 * Recursively find all .ts/.tsx files under a directory.
 */
function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) results.push(full);
  }
  return results;
}

/**
 * Extract JSON-LD object literals from source code.
 * Looks for patterns like: { "@context": "...", "@type": "..." ... }
 * that are passed to useJsonLd / useMultiJsonLd or assigned to ld+json scripts.
 */
function extractJsonLdBlocks(source, filePath) {
  const blocks = [];

  // Strategy 1: Find template-literal JSON-LD in application/ld+json (must start with {)
  const scriptRegex = /application\/ld\+json[^`]*`(\s*\{[^`]+)`/g;
  let m;
  while ((m = scriptRegex.exec(source)) !== null) {
    const raw = m[1].trim();
    // Skip if it contains JS expressions like ${...} — those are dynamic
    if (/\$\{/.test(raw)) continue;
    blocks.push({ raw, source: "ld+json script", file: filePath });
  }

  // Strategy 2: Find object literals passed to useJsonLd / useMultiJsonLd
  // We look for '@context' references and try to extract the surrounding object.
  // Since these are JS objects (not JSON), we do structural validation instead.
  const contextRegex = /['"]@context['"]\s*:\s*['"]([^'"]*)['"]/g;
  while ((m = contextRegex.exec(source)) !== null) {
    const ctx = m[1];
    // Find the nearest @type
    const nearby = source.substring(Math.max(0, m.index - 200), m.index + 500);
    const typeMatch = nearby.match(/['"]@type['"]\s*:\s*['"]([^'"]*)['"]/);
    blocks.push({
      contextValue: ctx,
      typeValue: typeMatch ? typeMatch[1] : null,
      source: "JS object literal",
      file: filePath,
    });
  }

  return blocks;
}

/* ── Main ── */

console.log(`\n${c.bold}${c.cyan}🔍 JSON-LD Parse & Validation Audit${c.reset}\n`);

const files = walk(SRC);
const allBlocks = [];

for (const f of files) {
  const src = fs.readFileSync(f, "utf-8");
  if (!src.includes("@context") && !src.includes("ld+json")) continue;
  const blocks = extractJsonLdBlocks(src, path.relative(ROOT, f));
  allBlocks.push(...blocks);
}

if (allBlocks.length === 0) {
  console.log(`${c.red}✗ No JSON-LD blocks found in source code${c.reset}`);
  process.exit(1);
}

let passed = 0;
let failed = 0;
const results = [];

for (const block of allBlocks) {
  const label = `${block.file} (${block.source})`;

  // If it's a raw JSON string from ld+json script tag
  if (block.raw) {
    try {
      const obj = JSON.parse(block.raw);
      const missing = [];
      if (!obj["@context"]) missing.push("@context");
      if (!obj["@type"]) missing.push("@type");
      if (missing.length > 0) {
        console.log(`  ${c.red}✗${c.reset} ${label} — missing: ${missing.join(", ")}`);
        results.push({ label, pass: false, reason: `Missing ${missing.join(", ")}` });
        failed++;
      } else {
        console.log(`  ${c.green}✓${c.reset} ${label} — @type: ${obj["@type"]}`);
        results.push({ label, pass: true });
        passed++;
      }
    } catch (e) {
      console.log(`  ${c.red}✗${c.reset} ${label} — invalid JSON: ${e.message}`);
      results.push({ label, pass: false, reason: `Invalid JSON: ${e.message}` });
      failed++;
    }
    continue;
  }

  // JS object literal validation
  const missing = [];
  if (!block.contextValue || !block.contextValue.includes("schema.org")) {
    missing.push("@context (must reference schema.org)");
  }
  if (!block.typeValue) {
    missing.push("@type");
  }

  if (missing.length > 0) {
    console.log(`  ${c.red}✗${c.reset} ${label} — missing: ${missing.join(", ")}`);
    results.push({ label, pass: false, reason: `Missing ${missing.join(", ")}` });
    failed++;
  } else {
    console.log(`  ${c.green}✓${c.reset} ${label} — @type: ${block.typeValue}`);
    results.push({ label, pass: true });
    passed++;
  }
}

/* ── Summary ── */

console.log(`\n${c.bold}${"═".repeat(50)}${c.reset}`);
console.log(`  Total JSON-LD blocks: ${allBlocks.length}`);
console.log(`  ${c.green}Valid: ${passed}${c.reset}`);
if (failed > 0) console.log(`  ${c.red}Invalid: ${failed}${c.reset}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = failed > 0 ? "❌" : "✅";
  let md = `## ${icon} JSON-LD Parse & Validation Audit\n\n`;
  md += `| Block | Status | Details |\n|---|---|---|\n`;
  for (const r of results) {
    md += `| ${r.label} | ${r.pass ? "✅" : "❌"} | ${r.reason || "Valid"} |\n`;
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (failed > 0) {
  console.log(`\n${c.red}${c.bold}❌ JSON-LD validation failed — merge blocked${c.reset}\n`);
  process.exit(1);
} else {
  console.log(`\n${c.green}${c.bold}✅ All JSON-LD blocks are valid${c.reset}\n`);
  process.exit(0);
}