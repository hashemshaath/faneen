#!/usr/bin/env node
/**
 * Sitemap ↔ Robots.txt Integrity Audit
 * ─────────────────────────────────────
 * 1. يقرأ sitemap index الثابت ويستخرج روابط sub-sitemaps.
 * 2. يقرأ كود edge function الخاص بالـ sitemap ويستخرج المسارات الثابتة.
 * 3. يتحقق أن المسارات المُدرجة لا تقع ضمن Disallow في robots.txt.
 * 4. يتحقق أن لا مسار ثابت يوجّه نحو admin/dashboard/auth.
 * 5. يتحقق من اتساق أنواع sub-sitemaps بين الملف الثابت وedge function.
 *
 * Exit codes: 0 = pass, 1 = critical failures
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

function read(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, 'utf8');
}

const findings = [];

// ── 1. Parse static sitemap.xml (sitemap index) ─────────
const report = { forbidden: [], missingAllowed: [], domainErrors: [], supabaseLeaks: [], typeMismatches: [] };

// ──────────────────────────────────────────────────────────
console.log(`\n${c.bold}${c.cyan}🗺️  Sitemap ↔ Robots Integrity Audit${c.reset}\n`);

const sitemapXml = read('public/sitemap.xml');
const robotsTxt = read('public/robots.txt');
const sitemapEdge = read('supabase/functions/sitemap/index.ts');
const robotsEdge = read('supabase/functions/robots/index.ts');

if (!sitemapXml) {
  console.log(`${c.red}✗ public/sitemap.xml not found${c.reset}`);
  process.exit(1);
}
if (!robotsTxt) {
  console.log(`${c.red}✗ public/robots.txt not found${c.reset}`);
  process.exit(1);
}

// ── 2. Verify sitemap index is sitemapindex format ───────
console.log(`${c.bold}📋 فحص هيكلية sitemap index${c.reset}`);
const isSitemapIndex = sitemapXml.includes('<sitemapindex');
if (!isSitemapIndex) {
  findings.push({ level: 'critical', msg: 'public/sitemap.xml ليس sitemapindex — يجب أن يحتوي <sitemapindex>' });
  console.log(`   ${c.red}✗${c.reset}  ليس sitemapindex`);
} else {
  console.log(`   ${c.green}✓${c.reset}  sitemapindex format`);
}

// ── 3. Extract sub-sitemap types from static file ────────
const subSitemapUrls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const staticTypes = subSitemapUrls
  .map(u => { const m = u.match(/[?&]type=(\w+)/); return m ? m[1] : null; })
  .filter(Boolean);

console.log(`\n${c.bold}📂 أنواع sub-sitemaps في الملف الثابت (${staticTypes.length})${c.reset}`);
for (const t of staticTypes) {
  console.log(`   ${c.green}✓${c.reset}  ${t}`);
}

// ── 4. Extract types from edge function ──────────────────
console.log(`\n${c.bold}⚡ فحص edge function sitemap${c.reset}`);
if (sitemapEdge) {
  // Extract TYPES array from edge function
  const typesMatch = sitemapEdge.match(/TYPES\s*=\s*\[([^\]]+)\]/);
  const edgeTypes = typesMatch
    ? [...typesMatch[1].matchAll(/"(\w+)"/g)].map(m => m[1])
    : [];

  if (edgeTypes.length === 0) {
    findings.push({ level: 'warn', msg: 'لم يتم العثور على TYPES في edge function' });
    console.log(`   ${c.yellow}⚠${c.reset}  لم يتم استخراج TYPES`);
  } else {
    // Cross-check: static types should match edge types
    const missingInStatic = edgeTypes.filter(t => !staticTypes.includes(t));
    const extraInStatic = staticTypes.filter(t => !edgeTypes.includes(t));

    if (missingInStatic.length > 0) {
      for (const t of missingInStatic) {
        findings.push({ level: 'critical', msg: `نوع "${t}" موجود في edge function لكن مفقود في sitemap.xml الثابت` });
      }
      console.log(`   ${c.red}✗${c.reset}  أنواع مفقودة في sitemap.xml: ${missingInStatic.join(', ')}`);
    }
    if (extraInStatic.length > 0) {
      for (const t of extraInStatic) {
        findings.push({ level: 'warn', msg: `نوع "${t}" في sitemap.xml الثابت لكن غير موجود في edge function` });
      }
      console.log(`   ${c.yellow}⚠${c.reset}  أنواع زائدة في sitemap.xml: ${extraInStatic.join(', ')}`);
    }
    if (missingInStatic.length === 0 && extraInStatic.length === 0) {
      console.log(`   ${c.green}✓${c.reset}  الأنواع متطابقة (${edgeTypes.length}): ${edgeTypes.join(', ')}`);
    }
  }

  // ── 5. Extract static paths from edge function ─────────
  console.log(`\n${c.bold}🔗 فحص المسارات الثابتة في sitemap${c.reset}`);
  const staticPathMatches = [...sitemapEdge.matchAll(/loc:\s*"([^"]+)"/g)].map(m => m[1]);
  const FORBIDDEN_SEGMENTS = ['/admin/', '/dashboard/', '/auth', '/reset-password', '/onboarding', '/forbidden', '/unsubscribe'];

  let pathIssues = 0;
  for (const p of staticPathMatches) {
    for (const seg of FORBIDDEN_SEGMENTS) {
      if (p.includes(seg)) {
        findings.push({ level: 'critical', msg: `مسار محظور "${p}" في sitemap edge function` });
        console.log(`   ${c.red}✗${c.reset}  ${p} → يحتوي ${seg}`);
        pathIssues++;
      }
    }
  }
  if (pathIssues === 0) {
    console.log(`   ${c.green}✓${c.reset}  لا مسارات محظورة في الـ sitemap`);
  }
} else {
  findings.push({ level: 'warn', msg: 'ملف edge function sitemap غير موجود' });
  console.log(`   ${c.yellow}⚠${c.reset}  supabase/functions/sitemap/index.ts غير موجود`);
}

// ── 6. Robots.txt: verify Sitemap directive points to index ──
console.log(`\n${c.bold}🤖 فحص robots.txt Sitemap directives${c.reset}`);
const sitemapDirectives = [...robotsTxt.matchAll(/^Sitemap:\s*(.+)$/gm)].map(m => m[1].trim());

if (sitemapDirectives.length === 0) {
  findings.push({ level: 'critical', msg: 'robots.txt لا يحتوي أي Sitemap directive' });
  console.log(`   ${c.red}✗${c.reset}  لا يوجد Sitemap directive`);
} else {
  for (const s of sitemapDirectives) {
    // Must not expose supabase project ref
    if (/supabase\.co/i.test(s)) {
      findings.push({ level: 'critical', msg: `Sitemap directive يكشف نطاق Supabase الداخلي: ${s}` });
      console.log(`   ${c.red}✗${c.reset}  ${s} → يكشف نطاق Supabase`);
    } else {
      console.log(`   ${c.green}✓${c.reset}  ${s}`);
    }
  }
}

// Also check edge robots
if (robotsEdge) {
  if (/supabase\.co.*sitemap/i.test(robotsEdge)) {
    findings.push({ level: 'critical', msg: 'edge robots يكشف نطاق Supabase في Sitemap directive' });
    console.log(`   ${c.red}✗${c.reset}  edge robots: يكشف نطاق Supabase`);
  }
}

// ── 7. Cross-check: disallowed paths must not appear in static sitemap URLs ──
console.log(`\n${c.bold}🚫 فحص تعارض Disallow مع sitemap URLs${c.reset}`);
const disallowPaths = [...robotsTxt.matchAll(/^Disallow:\s*(.+)$/gm)]
  .map(m => m[1].trim())
  .filter(p => p.length > 1);

let crossIssues = 0;
for (const url of subSitemapUrls) {
  for (const dp of disallowPaths) {
    const cleanDp = dp.replace(/\/$/, '');
    if (url.includes(`qitaat.com${cleanDp}`) && !dp.includes('?')) {
      findings.push({ level: 'critical', msg: `sitemap URL "${url}" يتعارض مع Disallow: ${dp}` });
      console.log(`   ${c.red}✗${c.reset}  ${url} ↔ Disallow: ${dp}`);
      crossIssues++;
    }
  }
}
if (crossIssues === 0) {
  console.log(`   ${c.green}✓${c.reset}  لا تعارضات بين sitemap و robots.txt`);
}

// ── 8. Verify sub-sitemap URLs use qitaat.com domain ─────
console.log(`\n${c.bold}🌐 فحص نطاقات sub-sitemap URLs${c.reset}`);
let domainIssues = 0;
for (const url of subSitemapUrls) {
  if (!url.startsWith('https://qitaat.com/')) {
    findings.push({ level: 'critical', msg: `sub-sitemap URL يستخدم نطاقاً خاطئاً: ${url}` });
    console.log(`   ${c.red}✗${c.reset}  ${url}`);
    domainIssues++;
  }
}
if (domainIssues === 0) {
  console.log(`   ${c.green}✓${c.reset}  جميع URLs تستخدم qitaat.com`);
}

// ── Report ───────────────────────────────────────────────
console.log(`\n${c.bold}${'═'.repeat(55)}${c.reset}`);
const criticals = findings.filter(f => f.level === 'critical');
const warns = findings.filter(f => f.level === 'warn');

if (findings.length === 0) {
  console.log(`${c.green}${c.bold}✅ Sitemap integrity audit passed${c.reset}\n`);
  process.exit(0);
}

if (criticals.length > 0) {
  console.log(`\n${c.red}${c.bold}❌ تعارضات حرجة (${criticals.length})${c.reset}`);
  for (const f of criticals) {
    console.log(`   ${c.red}✗${c.reset} ${f.msg}`);
  }
}
if (warns.length > 0) {
  console.log(`\n${c.yellow}${c.bold}⚠ تحذيرات (${warns.length})${c.reset}`);
  for (const f of warns) {
    console.log(`   ${c.yellow}⚠${c.reset} ${f.msg}`);
  }
}

console.log();
process.exit(criticals.length > 0 ? 1 : 0);