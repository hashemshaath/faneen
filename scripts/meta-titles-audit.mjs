#!/usr/bin/env node
/**
 * Page Meta (Title / Description) Audit
 * ──────────────────────────────────────
 * For every static page in the sitemap, verifies:
 *   1. usePageMeta is called with a non-empty title
 *   2. usePageMeta is called with a non-empty description
 *   3. No two pages share the exact same title or description
 *
 * Exit 1 on critical failures.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const c = {
  reset: "\x1b[0m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};

/* ── Sitemap static pages → source files ── */

const SITEMAP_PAGES = [
  { path: "/", file: "src/pages/Index.tsx" },
  { path: "/search", file: "src/pages/Search.tsx" },
  { path: "/categories", file: "src/pages/Categories.tsx" },
  { path: "/offers", file: "src/pages/Offers.tsx" },
  { path: "/projects", file: "src/pages/Projects.tsx" },
  { path: "/blog", file: "src/pages/Blog.tsx" },
  { path: "/profile-systems", file: "src/pages/ProfileSystems.tsx" },
  { path: "/compare", file: "src/pages/Compare.tsx" },
  { path: "/compare-profiles", file: "src/pages/CompareProfiles.tsx" },
  { path: "/membership", file: "src/pages/Membership.tsx" },
  { path: "/about", file: "src/pages/About.tsx" },
  { path: "/contact", file: "src/pages/Contact.tsx" },
  { path: "/privacy", file: "src/pages/Privacy.tsx" },
  { path: "/terms", file: "src/pages/Terms.tsx" },
];

/* ── Dynamic detail pages (also checked) ── */

const DETAIL_PAGES = [
  { path: "/:username", file: "src/pages/BusinessProfile.tsx" },
  { path: "/blog/:slug", file: "src/pages/BlogPost.tsx" },
  { path: "/projects/:id", file: "src/pages/ProjectDetail.tsx" },
  { path: "/profile-systems/:slug", file: "src/pages/ProfileSystemDetail.tsx" },
];

const ALL_PAGES = [...SITEMAP_PAGES, ...DETAIL_PAGES];

/* ── Extract title and description from usePageMeta call ── */

function extractMeta(source) {
  // Find usePageMeta({ ... }) — may span multiple lines
  const metaMatch = source.match(/usePageMeta\(\{([\s\S]*?)\}\)/);
  if (!metaMatch) return null;
  const block = metaMatch[1];

  const titleMatch = block.match(/title:\s*(?:'([^']*)'|"([^"]*)")/);
  const descMatch = block.match(/description:\s*(?:'([^']*)'|"([^"]*)")/);

  // Also detect dynamic/conditional titles
  const hasDynamicTitle = /title:\s*[^'"\s]/.test(block) && !titleMatch;
  const hasDynamicDesc = /description:\s*[^'"\s]/.test(block) && !descMatch;

  return {
    title: titleMatch ? (titleMatch[1] || titleMatch[2] || "") : null,
    description: descMatch ? (descMatch[1] || descMatch[2] || "") : null,
    hasDynamicTitle,
    hasDynamicDesc,
    hasHook: true,
  };
}

/* ── Run checks ── */

console.log(`\n${c.bold}${c.cyan}📝 Page Meta (Title/Description) Audit${c.reset}\n`);

const findings = [];
const titles = new Map();   // title → [paths]
const descs = new Map();    // desc → [paths]
let criticalFail = false;

for (const page of ALL_PAGES) {
  const abs = path.join(ROOT, page.file);
  if (!fs.existsSync(abs)) {
    console.log(`   ${c.yellow}⚠${c.reset} ${page.path} — file not found: ${page.file}`);
    findings.push({ path: page.path, level: "warn", msg: "Source file not found" });
    continue;
  }

  const source = fs.readFileSync(abs, "utf-8");

  // Check usePageMeta is called
  if (!/usePageMeta/.test(source)) {
    console.log(`   ${c.red}✗${c.reset} ${page.path} — usePageMeta not called`);
    findings.push({ path: page.path, level: "critical", msg: "usePageMeta not called" });
    criticalFail = true;
    continue;
  }

  const meta = extractMeta(source);

  // Title check
  if (meta?.title) {
    if (meta.title.trim().length === 0) {
      console.log(`   ${c.red}✗${c.reset} ${page.path} — empty title string`);
      findings.push({ path: page.path, level: "critical", msg: "Empty title" });
      criticalFail = true;
    } else {
      // Track for duplicate detection
      const key = meta.title.trim().toLowerCase();
      if (!titles.has(key)) titles.set(key, []);
      titles.get(key).push(page.path);
    }
  } else if (meta?.hasDynamicTitle) {
    // Dynamic/conditional title — OK
  } else if (!meta) {
    console.log(`   ${c.red}✗${c.reset} ${page.path} — could not parse usePageMeta`);
    findings.push({ path: page.path, level: "critical", msg: "Cannot parse usePageMeta" });
    criticalFail = true;
    continue;
  } else {
    console.log(`   ${c.red}✗${c.reset} ${page.path} — no title found`);
    findings.push({ path: page.path, level: "critical", msg: "Missing title" });
    criticalFail = true;
  }

  // Description check — critical for sitemap pages, warning for detail pages
  const isSitemapPage = SITEMAP_PAGES.some((p) => p.path === page.path);

  if (meta?.description) {
    if (meta.description.trim().length === 0) {
      const level = isSitemapPage ? "critical" : "warn";
      const icon = isSitemapPage ? `${c.red}✗` : `${c.yellow}⚠`;
      console.log(`   ${icon}${c.reset} ${page.path} — empty description`);
      findings.push({ path: page.path, level, msg: "Empty description" });
      if (isSitemapPage) criticalFail = true;
    } else {
      const key = meta.description.trim().toLowerCase();
      if (!descs.has(key)) descs.set(key, []);
      descs.get(key).push(page.path);
    }
  } else if (meta?.hasDynamicDesc) {
    // Dynamic description — OK
  } else {
    const level = isSitemapPage ? "critical" : "warn";
    const icon = isSitemapPage ? `${c.red}✗` : `${c.yellow}⚠`;
    console.log(`   ${icon}${c.reset} ${page.path} — no description found`);
    findings.push({ path: page.path, level, msg: "Missing description" });
    if (isSitemapPage) criticalFail = true;
  }

  // If no issues so far for this page
  if (!findings.some((f) => f.path === page.path)) {
    console.log(`   ${c.green}✓${c.reset} ${page.path} — title ✓ description ✓`);
  }
}

/* ── Duplicate detection ── */

console.log(`\n${c.bold}Duplicate Detection:${c.reset}`);
let hasDupes = false;

for (const [title, paths] of titles) {
  if (paths.length > 1) {
    hasDupes = true;
    console.log(`   ${c.red}✗${c.reset} Duplicate title "${title.substring(0, 50)}…" in: ${paths.join(", ")}`);
    findings.push({ path: paths.join(", "), level: "critical", msg: `Duplicate title: "${title.substring(0, 60)}"` });
    criticalFail = true;
  }
}

for (const [desc, paths] of descs) {
  if (paths.length > 1) {
    hasDupes = true;
    console.log(`   ${c.yellow}⚠${c.reset} Duplicate description in: ${paths.join(", ")}`);
    findings.push({ path: paths.join(", "), level: "warn", msg: `Duplicate description` });
  }
}

if (!hasDupes) {
  console.log(`   ${c.green}✓${c.reset} No duplicate titles or descriptions found`);
}

/* ── Summary ── */

const criticals = findings.filter((f) => f.level === "critical").length;
const warns = findings.filter((f) => f.level === "warn").length;

console.log(`\n${c.bold}${"═".repeat(55)}${c.reset}`);
console.log(`   Pages checked: ${ALL_PAGES.length}`);
console.log(`   ${c.green}Passed: ${ALL_PAGES.length - new Set(findings.map(f => f.path)).size}${c.reset}`);
if (criticals > 0) console.log(`   ${c.red}Critical: ${criticals}${c.reset}`);
if (warns > 0) console.log(`   ${c.yellow}Warnings: ${warns}${c.reset}`);

// GitHub Actions Summary
if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = criticalFail ? "❌" : "✅";
  let md = `## ${icon} Page Meta (Title/Description) Audit\n\n`;
  md += `| Metric | Count |\n|---|---|\n`;
  md += `| Pages checked | ${ALL_PAGES.length} |\n`;
  md += `| Critical issues | ${criticals} |\n`;
  md += `| Warnings | ${warns} |\n\n`;

  if (findings.length > 0) {
    md += `### Findings\n\n| Path | Level | Issue |\n|---|---|---|\n`;
    for (const f of findings) {
      const lvl = f.level === "critical" ? "❌" : "⚠️";
      md += `| \`${f.path}\` | ${lvl} | ${f.msg} |\n`;
    }
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (criticalFail) {
  console.log(`\n${c.red}${c.bold}❌ Meta audit failed — merge blocked${c.reset}\n`);
  process.exit(1);
} else {
  console.log(`\n${c.green}${c.bold}✅ All pages have valid title & description${c.reset}\n`);
  process.exit(0);
}