#!/usr/bin/env node
/**
 * Contrast / Semantic-Tokens Audit
 * --------------------------------
 * Guards a small allow-list of "Lighthouse-sensitive" UI elements that are
 * known to fail color-contrast checks when authored with raw hex colors
 * instead of design-token CSS variables.
 *
 * For each guarded file we:
 *   1. ensure no raw `text-[#...]`, `bg-[#...]`, `border-[#...]` Tailwind
 *      arbitrary values appear (they bypass the design system),
 *   2. ensure no inline `style={{ color: "#..." }}` / `background: "#..."`
 *      uses a literal hex,
 *   3. ensure none of the disallowed legacy hex literals appear inline.
 *
 * Files that are intentionally exempt (e.g. brand assets that ship raw
 * brand colors) live in `docs/brand-color-audit-exceptions.md` and can be
 * added to ALLOWED_FILES below if needed.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

/** Files that MUST stay token-only (Lighthouse contrast offenders). */
const GUARDED_FILES = [
  "src/components/layout/Navbar.tsx",                 // ⌘K kbd, "سجل الآن"
  "src/components/home/HeroSection.tsx",              // "بحث" button
  "src/components/home/LatestProjectsSection.tsx",    // card chips/badges
  "src/components/consent/ConsentBanner.tsx",         // "قبول الكل"
  "src/index.css",                                    // .section-eyebrow
];

/** Hex literals that previously caused contrast failures. */
const DISALLOWED_HEX = [
  "#EDEFF3", "#DDE2EA", "#E2E6EE", "#94A0B2",
  // Note: #1A2230 and #6B7689 remain explicitly allowed (see
  // docs/brand-color-audit-exceptions.md) — Lighthouse passes for them.
];

const ARBITRARY_HEX_RE = /(?:text|bg|border|ring|from|to|via|fill|stroke|placeholder|decoration|shadow|outline)-\[#[0-9a-fA-F]{3,8}\b[^\]]*\]/g;
const INLINE_STYLE_HEX_RE = /style=\{\{[^}]*?#[0-9a-fA-F]{3,8}\b[^}]*?\}\}/g;

const errors = [];

for (const rel of GUARDED_FILES) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) {
    errors.push(`${rel}  ❌  guarded file is missing`);
    continue;
  }
  const src = readFileSync(path, "utf8");

  const arbitraryHits = src.match(ARBITRARY_HEX_RE) ?? [];
  for (const hit of arbitraryHits) {
    errors.push(`${rel}  ❌  arbitrary hex Tailwind value: ${hit}`);
  }

  const inlineHits = src.match(INLINE_STYLE_HEX_RE) ?? [];
  for (const hit of inlineHits) {
    errors.push(`${rel}  ❌  inline style hex: ${hit.slice(0, 80)}…`);
  }

  for (const hex of DISALLOWED_HEX) {
    if (src.includes(hex)) {
      errors.push(`${rel}  ❌  disallowed legacy hex literal: ${hex}`);
    }
  }
}

console.log("\n🎨  Contrast / Semantic-Tokens Audit");
console.log(`   Guarded files: ${GUARDED_FILES.length}`);
console.log(`   Disallowed hex literals: ${DISALLOWED_HEX.length}\n`);

if (errors.length > 0) {
  for (const e of errors) console.log("   " + e);
  console.log(`\n❌  ${errors.length} contrast-token violation(s) — fix before publishing.`);
  process.exit(1);
}

console.log("✅  All guarded elements use semantic tokens only. No disallowed hex.");
process.exit(0);