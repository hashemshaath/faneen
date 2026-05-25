#!/usr/bin/env node
/**
 * Contrast / Semantic-Tokens Audit
 * --------------------------------
 * Targeted regression guard for the specific Lighthouse contrast failures
 * that were fixed in the pre-launch contrast-fix passes. Each rule asserts
 * that ONE Lighthouse-sensitive element keeps using semantic design tokens
 * (or a known-good variant) — so future edits can't silently re-introduce
 * the broken styling.
 *
 * Broader hex coverage already lives in `scripts/audit-brand-colors.mjs`.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const errors = [];

function read(rel) {
  const p = join(ROOT, rel);
  if (!existsSync(p)) {
    return null;
  }
  return readFileSync(p, "utf8");
}

function expect(cond, file, message) {
  if (!cond) errors.push(`${file}  ❌  ${message}`);
}

/* ---- 1. Navbar: ⌘K kbd uses semantic tokens ---- */
const navbar = read("src/components/layout/Navbar.tsx");
if (navbar) {
  // The kbd element rendering ⌘K must NOT carry a `bg-[#...]` arbitrary value.
  const kbdMatch = navbar.match(/<kbd[\s\S]*?⌘K[\s\S]*?<\/kbd>/);
  if (!kbdMatch) {
    errors.push("src/components/layout/Navbar.tsx  ❌  ⌘K kbd element not found");
  } else {
    expect(
      !/bg-\[#/.test(kbdMatch[0]) && !/text-\[#/.test(kbdMatch[0]) && !/border-\[#/.test(kbdMatch[0]),
      "src/components/layout/Navbar.tsx",
      "⌘K kbd must not use arbitrary hex tailwind values (use bg-muted/text-foreground/border-border)",
    );
    expect(
      /bg-muted/.test(kbdMatch[0]),
      "src/components/layout/Navbar.tsx",
      "⌘K kbd must use bg-muted token",
    );
  }

  // "سجل الآن" register button must use variant="primary".
  const regMatch = navbar.match(/<Button[^>]*>[\s\S]{0,80}سجل الآن/);
  if (regMatch) {
    expect(
      /variant=["']primary["']/.test(regMatch[0]),
      "src/components/layout/Navbar.tsx",
      "'سجل الآن' button must use variant=\"primary\" (token-driven)",
    );
  }
}

/* ---- 2. HeroSection: "بحث" submit button uses variant="primary" ---- */
const hero = read("src/components/home/HeroSection.tsx");
if (hero) {
  const searchBtn = hero.match(/<Button[^>]*type=["']submit["'][^>]*>/);
  expect(
    !!searchBtn && /variant=["']primary["']/.test(searchBtn[0]),
    "src/components/home/HeroSection.tsx",
    "Hero search submit button must use variant=\"primary\"",
  );
}

/* ---- 3. index.css: .section-eyebrow uses solid token, not 0.16 alpha ---- */
const css = read("src/index.css");
if (css) {
  const eyebrow = css.match(/\.section-eyebrow\s*\{[^}]*\}/);
  if (!eyebrow) {
    errors.push("src/index.css  ❌  .section-eyebrow rule not found");
  } else {
    expect(
      !/--primary\)\s*\/\s*0?\.[0-3]/.test(eyebrow[0]),
      "src/index.css",
      ".section-eyebrow must not use low-alpha primary background (fails 4.5:1)",
    );
    expect(
      /var\(--primary-foreground\)|hsl\(var\(--primary-foreground\)\)/.test(eyebrow[0]),
      "src/index.css",
      ".section-eyebrow must use --primary-foreground for text color",
    );
  }
}

/* ---- 4. LatestProjectsSection: card description not muted-foreground ---- */
const latest = read("src/components/home/LatestProjectsSection.tsx");
if (latest) {
  // Cost/duration chips must be foreground/80 not muted-foreground (the latter
  // failed contrast on muted backgrounds).
  expect(
    !/className=["'][^"']*\btext-muted-foreground\b[^"']*["'][^>]*>\s*\{[^}]*?(cost|duration|price)/i.test(latest),
    "src/components/home/LatestProjectsSection.tsx",
    "Card cost/duration chips must not use text-muted-foreground (use text-foreground/80)",
  );
}

/* ---- 5. ConsentBanner: "accept all" button is solid primary ---- */
const consent = read("src/components/consent/ConsentBanner.tsx");
if (consent) {
  // Some i18n key like accept_all / acceptAll OR Arabic 'قبول الكل'.
  const acceptBtn = consent.match(/<Button[\s\S]{0,200}?(accept[_A-Za-z]*All|قبول الكل)[\s\S]{0,40}?<\/Button>/i)
    ?? consent.match(/<button[\s\S]{0,200}?(accept[_A-Za-z]*All|قبول الكل)[\s\S]{0,40}?<\/button>/i);
  if (acceptBtn) {
    expect(
      /variant=["']primary["']/.test(acceptBtn[0])
        || /bg-primary\b/.test(acceptBtn[0])
        || !/variant=/.test(acceptBtn[0]) /* default = bg-primary */,
      "src/components/consent/ConsentBanner.tsx",
      "'قبول الكل' button must be variant=\"primary\" or bg-primary (default)",
    );
    expect(
      !/bg-\[#/.test(acceptBtn[0]) && !/text-\[#/.test(acceptBtn[0]),
      "src/components/consent/ConsentBanner.tsx",
      "'قبول الكل' button must not use arbitrary hex Tailwind values",
    );
  }
}

console.log("\n🎨  Contrast / Semantic-Tokens Audit (regression guard)");
if (errors.length > 0) {
  for (const e of errors) console.log("   " + e);
  console.log(`\n❌  ${errors.length} contrast-token violation(s) — fix before publishing.`);
  process.exit(1);
}
console.log("✅  All Lighthouse-sensitive elements still use semantic tokens.");
process.exit(0);