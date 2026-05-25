#!/usr/bin/env node
/**
 * Schema.org Structured Data Audit
 * ─────────────────────────────────
 * Statically verifies that required JSON-LD Schema.org types
 * are present in the source code of key pages.
 *
 * Rules:
 *   - Index.tsx MUST contain WebSite + Organization (or publisher with Organization)
 *   - BusinessProfile.tsx MUST contain LocalBusiness + BreadcrumbList
 *   - BlogPost.tsx SHOULD contain Article or BlogPosting
 *
 * Exit 1 on any critical missing schema.
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

function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, "utf-8");
}

/**
 * Check if source contains a JSON-LD @type reference.
 * Matches: '@type': 'TypeName'  or  "@type": "TypeName"  or  @type.*TypeName
 */
function hasSchemaType(source, typeName) {
  const patterns = [
    new RegExp(`['"]@type['"]\\s*:\\s*['"]${typeName}['"]`),
    new RegExp(`@type.*${typeName}`),
  ];
  return patterns.some((p) => p.test(source));
}

/**
 * Check if source uses useJsonLd or useMultiJsonLd hooks.
 */
function usesJsonLdHook(source) {
  return /use(Multi)?JsonLd/.test(source);
}

/* ── Page definitions ── */

const pages = [
  {
    name: "الصفحة الرئيسية (Index)",
    file: "src/pages/Index.tsx",
    required: [
      { type: "WebSite", label: "WebSite schema" },
      { type: "Organization", label: "Organization (publisher or standalone)" },
    ],
    requiredFields: [
      { field: "sameAs", label: "sameAs social links" },
      { field: "contactPoint", label: "contactPoint info" },
    ],
    critical: true,
  },
  {
    name: "صفحة الجهة (BusinessProfile)",
    file: "src/pages/BusinessProfile.tsx",
    required: [
      { type: "LocalBusiness", label: "LocalBusiness schema" },
      { type: "BreadcrumbList", label: "BreadcrumbList schema" },
      { type: "Review", label: "Review schema" },
      { type: "AggregateRating", label: "AggregateRating schema" },
    ],
    requiredFields: [
      { field: "reviewRating", label: "reviewRating in Review entities" },
      { field: "itemReviewed", label: "itemReviewed in Review entities" },
    ],
    critical: true,
  },
  {
    name: "صفحة المقال (BlogPost)",
    file: "src/pages/BlogPost.tsx",
    required: [
      { type: "Article|BlogPosting", label: "Article or BlogPosting schema" },
    ],
    critical: false,
  },
  {
    name: "صفحة المشروع (ProjectDetail)",
    file: "src/pages/ProjectDetail.tsx",
    required: [
      { type: "CreativeWork|Product", label: "CreativeWork or Product schema" },
    ],
    critical: false,
  },
  {
    name: "صفحة القطاع (ProfileSystemDetail)",
    file: "src/pages/ProfileSystemDetail.tsx",
    required: [
      { type: "Product", label: "Product schema" },
      { type: "FAQPage", label: "FAQPage schema" },
    ],
    critical: true,
  },
  {
    name: "صفحة من نحن (About)",
    file: "src/pages/About.tsx",
    required: [
      { type: "BreadcrumbList", label: "BreadcrumbList schema" },
      { type: "FAQPage", label: "FAQPage schema" },
    ],
    critical: true,
  },
];

/* ── Hooks file validation ── */

const hooksSource = read("src/hooks/usePageMeta.ts");
const hookChecks = [];

if (hooksSource) {
  // Verify useJsonLd and useMultiJsonLd exports exist
  const hasUseJsonLd = /export\s+function\s+useJsonLd/.test(hooksSource);
  const hasUseMultiJsonLd = /export\s+function\s+useMultiJsonLd/.test(hooksSource);

  hookChecks.push({
    label: "useJsonLd hook exported",
    pass: hasUseJsonLd,
    critical: true,
  });
  hookChecks.push({
    label: "useMultiJsonLd hook exported",
    pass: hasUseMultiJsonLd,
    critical: true,
  });

  // Verify JSON-LD injection uses application/ld+json
  const hasLdJsonType = /application\/ld\+json/.test(hooksSource);
  hookChecks.push({
    label: "JSON-LD uses application/ld+json type",
    pass: hasLdJsonType,
    critical: true,
  });
} else {
  hookChecks.push({
    label: "usePageMeta.ts exists",
    pass: false,
    critical: true,
  });
}

/* ── Run checks ── */

console.log(`\n${c.bold}${c.cyan}📋 Schema.org Structured Data Audit${c.reset}\n`);

const results = [];
let criticalFail = false;

// Hook checks
console.log(`${c.bold}Hooks Infrastructure:${c.reset}`);
for (const check of hookChecks) {
  const icon = check.pass ? `${c.green}✓` : check.critical ? `${c.red}✗` : `${c.yellow}⚠`;
  console.log(`   ${icon}${c.reset} ${check.label}`);
  results.push({ page: "Hooks", ...check });
  if (!check.pass && check.critical) criticalFail = true;
}

// Page checks
for (const page of pages) {
  console.log(`\n${c.bold}${page.name}:${c.reset}`);
  const source = read(page.file);

  if (!source) {
    console.log(`   ${c.red}✗${c.reset} File not found: ${page.file}`);
    results.push({ page: page.name, label: "File exists", pass: false, critical: page.critical });
    if (page.critical) criticalFail = true;
    continue;
  }

  // Check for JSON-LD hook usage
  const hasHook = usesJsonLdHook(source);
  const hookIcon = hasHook ? `${c.green}✓` : page.critical ? `${c.red}✗` : `${c.yellow}⚠`;
  console.log(`   ${hookIcon}${c.reset} Uses useJsonLd/useMultiJsonLd hook`);
  results.push({ page: page.name, label: "JSON-LD hook used", pass: hasHook, critical: page.critical });
  if (!hasHook && page.critical) criticalFail = true;

  // Check required schema types
  for (const req of page.required) {
    // Support "Type1|Type2" as alternatives
    const types = req.type.split("|");
    const found = types.some((t) => hasSchemaType(source, t));
    const icon = found ? `${c.green}✓` : page.critical ? `${c.red}✗` : `${c.yellow}⚠`;
    console.log(`   ${icon}${c.reset} ${req.label}`);
    results.push({ page: page.name, label: req.label, pass: found, critical: page.critical });
    if (!found && page.critical) criticalFail = true;
  }

  // Check schema.org context reference
  const hasContext = /schema\.org/.test(source);
  const ctxIcon = hasContext ? `${c.green}✓` : page.critical ? `${c.red}✗` : `${c.yellow}⚠`;
  console.log(`   ${ctxIcon}${c.reset} References schema.org context`);
  results.push({ page: page.name, label: "schema.org context", pass: hasContext, critical: page.critical });
  if (!hasContext && page.critical) criticalFail = true;

  // Check required fields (e.g. sameAs, contactPoint)
  if (page.requiredFields) {
    for (const rf of page.requiredFields) {
      const fieldRegex = new RegExp(`['"]?${rf.field}['"]?\\s*:`);
      const found = fieldRegex.test(source);
      const icon = found ? `${c.green}✓` : page.critical ? `${c.red}✗` : `${c.yellow}⚠`;
      console.log(`   ${icon}${c.reset} ${rf.label}`);
      results.push({ page: page.name, label: rf.label, pass: found, critical: page.critical });
      if (!found && page.critical) criticalFail = true;
    }
  }
}

/* ── Summary ── */

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const criticalFailed = results.filter((r) => !r.pass && r.critical).length;

console.log(`\n${c.bold}${"═".repeat(55)}${c.reset}`);
console.log(`   Total checks: ${results.length}`);
console.log(`   ${c.green}Passed: ${passed}${c.reset}`);
if (failed > 0) console.log(`   ${c.red}Failed: ${failed} (${criticalFailed} critical)${c.reset}`);

// GitHub Actions Summary
if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = criticalFail ? "❌" : "✅";
  let md = `## ${icon} Schema.org Structured Data Audit\n\n`;
  md += `| Metric | Count |\n|---|---|\n`;
  md += `| Total checks | ${results.length} |\n`;
  md += `| Passed | ${passed} |\n`;
  md += `| Failed | ${failed} |\n`;
  md += `| Critical failures | ${criticalFailed} |\n\n`;

  md += `### Details\n\n| Page | Check | Status |\n|---|---|---|\n`;
  for (const r of results) {
    const st = r.pass ? "✅" : r.critical ? "❌ Critical" : "⚠️ Warning";
    md += `| ${r.page} | ${r.label} | ${st} |\n`;
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

if (criticalFail) {
  console.log(`\n${c.red}${c.bold}❌ Critical Schema.org checks failed — merge blocked${c.reset}\n`);
  process.exit(1);
} else {
  console.log(`\n${c.green}${c.bold}✅ All critical Schema.org checks passed${c.reset}\n`);
  process.exit(0);
}