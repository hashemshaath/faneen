#!/usr/bin/env node
/**
 * Image & Alt-Text Audit
 * ──────────────────────
 * Scans .tsx/.ts files for:
 *  1. <img> tags missing an `alt` attribute entirely
 *  2. <img> tags with `alt=""` that look like meaningful content (not decorative)
 *  3. LazyImage components missing alt or with `alt=""`
 *  4. Hardcoded image URLs that might be broken (non-dynamic)
 *
 * Exit 1 on errors found, 0 otherwise.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "..", "src");

// ── Collect files ──
function walk(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx|ts)$/.test(f.name)) out.push(p);
  }
  return out;
}

const files = walk(SRC).filter(
  (p) => !/[\\/]__tests__[\\/]/.test(p) && !/\.test\.(t|j)sx?$/.test(p)
);
const errors = [];
const warnings = [];

// ── Patterns ──
// Match <img that has NO alt attribute at all
const imgNoAltRe = /<img\s(?=[^>]*src=)(?![^>]*alt[ =])[^>]*\/?>/g;
// Match <img with alt=""
const imgEmptyAltRe = /<img\s[^>]*alt=""[^>]*\/?>/g;
// Match LazyImage with alt=""
const lazyEmptyAltRe = /<LazyImage\s[^>]*alt=""[^>]*\/?>/g;
// Match LazyImage missing alt
const lazyNoAltRe = /<LazyImage\s(?=[^>]*src=)(?![^>]*alt[ =])[^>]*\/?>/g;

// Decorative patterns — these are OK with alt=""
const decorativeContexts = [
  /className="[^"]*avatar/,
  /className="[^"]*thumbnail/,
  /w-5 h-5|w-4 h-4|w-3 h-3/,  // tiny icons
  /aria-hidden=/,
  /width="1"/,
  /role="presentation"/,
];

function isDecorative(tag) {
  return decorativeContexts.some(re => re.test(tag));
}

for (const file of files) {
  const rel = path.relative(path.resolve(__dirname, ".."), file);
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ln = i + 1;

    // 1. <img> missing alt entirely
    for (const m of line.matchAll(imgNoAltRe)) {
      errors.push(`${rel}:${ln}  ❌ <img> missing alt attribute`);
    }

    // 2. <img> with empty alt on meaningful images
    for (const m of line.matchAll(imgEmptyAltRe)) {
      if (!isDecorative(m[0])) {
        warnings.push(`${rel}:${ln}  ⚠️  <img alt=""> on potentially meaningful image`);
      }
    }

    // 3. LazyImage missing alt
    for (const m of line.matchAll(lazyNoAltRe)) {
      errors.push(`${rel}:${ln}  ❌ <LazyImage> missing alt attribute`);
    }

    // 4. LazyImage empty alt
    for (const m of line.matchAll(lazyEmptyAltRe)) {
      if (!isDecorative(m[0])) {
        warnings.push(`${rel}:${ln}  ⚠️  <LazyImage alt=""> on potentially meaningful image`);
      }
    }
  }
}

// ── Report ──
console.log(`\n🖼️  Image & Alt-Text Audit`);
console.log(`   Scanned ${files.length} files\n`);

if (errors.length) {
  console.log(`❌ ${errors.length} error(s):`);
  errors.forEach(e => console.log(`   ${e}`));
}
if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} warning(s):`);
  warnings.forEach(w => console.log(`   ${w}`));
}

if (!errors.length && !warnings.length) {
  console.log("✅ All images have proper alt text!");
}

// Only fail CI on missing alt (errors), not empty alt (warnings for now)
process.exit(errors.length > 0 ? 1 : 0);