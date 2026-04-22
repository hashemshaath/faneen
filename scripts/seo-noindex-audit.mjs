#!/usr/bin/env node
/**
 * SEO NoIndex / Canonical Audit
 * ─────────────────────────────
 * يفحص صفحات الخدمات والمعرض والإعلانات والفئات والبحث للتأكد من:
 *
 *  1. الصفحات العامة لا تحتوي على noindex ثابت (يمنع الفهرسة).
 *  2. لا يُستخدم useNoIndex في صفحة عامة.
 *  3. كل صفحة تستدعي usePageMeta (ضمان وجود canonical/title/description).
 *  4. لا يوجد canonical يشير لنطاق خاطئ (غير qitaat.com).
 *  5. صفحات الداشبورد والأدمن يجب أن تضع noindex: true.
 *
 * Exit codes:
 *   0 → نظيف ✅
 *   1 → تعارضات حرجة ❌
 */
import { readFileSync, existsSync, readdirSync as _readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

// ── Page classification ──────────────────────────────────
// PUBLIC pages must NOT have noindex (should be crawled).
const PUBLIC_PAGES = [
  'src/pages/Projects.tsx',
  'src/pages/ProjectDetail.tsx',
  'src/pages/Offers.tsx',
  'src/pages/Categories.tsx',
  'src/pages/BusinessProfile.tsx',
  'src/pages/Blog.tsx',
  'src/pages/BlogPost.tsx',
  'src/pages/About.tsx',
  'src/pages/Contact.tsx',
  'src/pages/Membership.tsx',
  'src/pages/Index.tsx',
  'src/pages/Privacy.tsx',
  'src/pages/Terms.tsx',
  'src/pages/ProfileSystems.tsx',
  'src/pages/ProfileSystemDetail.tsx',
];

// PRIVATE pages MUST have noindex (should not be crawled).
const PRIVATE_PAGES = [
  'src/pages/Onboarding.tsx',
  'src/pages/ResetPassword.tsx',
  'src/pages/Forbidden.tsx',
  'src/pages/NotFound.tsx',
];

// Search page has conditional noindex (noindex when query present) — special case.
const CONDITIONAL_NOINDEX_PAGES = [
  'src/pages/Search.tsx',
  'src/pages/Compare.tsx',
  'src/pages/CompareProfiles.tsx',
];

// Dashboard & admin: glob-matched patterns (files under these dirs should have noindex).
const PRIVATE_DIRS = ['src/pages/dashboard/', 'src/pages/admin/'];

const findings = [];

function read(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, 'utf8');
}

function audit(filePath, expectation) {
  const content = read(filePath);
  if (!content) {
    // Missing file is a warning, not a failure (page may have been removed).
    return;
  }

  const hasUsePageMeta = /usePageMeta\s*\(/.test(content);
  const hasUseNoIndex = /useNoIndex\s*\(/.test(content);
  const hasHardNoindex = /noindex:\s*true/.test(content);
  // Conditional noindex pattern: noindex: !!someVar or noindex: someCondition
  const hasConditionalNoindex = /noindex:\s*!!/.test(content) || /noindex:\s*[a-zA-Z]/.test(content);
  const hasBadCanonical = /canonical.*(?:faneen|localhost|127\.0\.0\.1|example\.com)/i.test(content);
  const hasWrongDomain = /https?:\/\/(?!qitaat\.com)[a-z]+\.[a-z]+.*canonical/i.test(content);

  // 1) Every page should use usePageMeta
  if (!hasUsePageMeta) {
    findings.push({ file: filePath, level: 'warn', msg: 'لا تستدعي usePageMeta — قد يفتقد العنوان والوصف وcanonical' });
  }

  // 2) Check noindex expectations
  if (expectation === 'public') {
    if (hasHardNoindex && !hasConditionalNoindex) {
      findings.push({ file: filePath, level: 'critical', msg: 'صفحة عامة تحتوي noindex: true ثابت — ستُمنع من الفهرسة!' });
    }
    if (hasUseNoIndex) {
      findings.push({ file: filePath, level: 'critical', msg: 'صفحة عامة تستدعي useNoIndex() — ستُمنع من الفهرسة!' });
    }
  } else if (expectation === 'private') {
    if (!hasHardNoindex && !hasUseNoIndex) {
      findings.push({ file: filePath, level: 'warn', msg: 'صفحة خاصة بدون noindex — قد تُفهرس بالخطأ' });
    }
  }
  // conditional: just ensure it's not hard-coded true without a variable

  // 3) Bad canonical domain
  if (hasBadCanonical || hasWrongDomain) {
    findings.push({ file: filePath, level: 'critical', msg: 'canonical يشير لنطاق خاطئ (غير qitaat.com)!' });
  }
}

// ── Run ──────────────────────────────────────────────────
console.log(`\n${c.bold}${c.cyan}🔍 SEO NoIndex / Canonical Audit${c.reset}\n`);

console.log(`${c.bold}📄 فحص الصفحات العامة (يجب ألا تحتوي noindex)${c.reset}`);
for (const f of PUBLIC_PAGES) {
  audit(f, 'public');
  const issues = findings.filter(fi => fi.file === f);
  const icon = issues.length === 0 ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
  console.log(`   ${icon}  ${f}${issues.length ? ` ${c.red}(${issues.length})${c.reset}` : ''}`);
}

console.log(`\n${c.bold}🔒 فحص الصفحات الخاصة (يجب أن تحتوي noindex)${c.reset}`);
for (const f of PRIVATE_PAGES) {
  audit(f, 'private');
  const issues = findings.filter(fi => fi.file === f);
  const icon = issues.length === 0 ? `${c.green}✓${c.reset}` : `${c.yellow}⚠${c.reset}`;
  console.log(`   ${icon}  ${f}${issues.length ? ` ${c.yellow}(${issues.length})${c.reset}` : ''}`);
}

console.log(`\n${c.bold}🔀 فحص صفحات noindex الشرطي${c.reset}`);
for (const f of CONDITIONAL_NOINDEX_PAGES) {
  audit(f, 'conditional');
  const issues = findings.filter(fi => fi.file === f);
  const icon = issues.length === 0 ? `${c.green}✓${c.reset}` : `${c.yellow}⚠${c.reset}`;
  console.log(`   ${icon}  ${f}${issues.length ? ` ${c.yellow}(${issues.length})${c.reset}` : ''}`);
}

// Scan dashboard & admin directories
console.log(`\n${c.bold}🛡️  فحص صفحات الداشبورد والأدمن${c.reset}`);
import { readdirSync } from 'node:fs';
for (const dir of PRIVATE_DIRS) {
  const absDir = join(ROOT, dir);
  if (!existsSync(absDir)) continue;
  for (const name of readdirSync(absDir)) {
    if (!name.endsWith('.tsx')) continue;
    const rel = dir + name;
    audit(rel, 'private');
    const issues = findings.filter(fi => fi.file === rel);
    const icon = issues.length === 0 ? `${c.green}✓${c.reset}` : `${c.yellow}⚠${c.reset}`;
    console.log(`   ${icon}  ${rel}${issues.length ? ` ${c.yellow}(${issues.length})${c.reset}` : ''}`);
  }
}

// ── Report ───────────────────────────────────────────────
// ── robots.txt / sitemap.xml cross-check ─────────────────
console.log(`\n${c.bold}🤖 فحص تطابق robots.txt مع sitemap.xml${c.reset}`);

const robotsTxt = read('public/robots.txt');
const sitemapXml = read('public/sitemap.xml');
const robotsEdge = read('supabase/functions/robots/index.ts');
const sitemapEdge = read('supabase/functions/sitemap/index.ts');

// Check that disallowed paths in robots are not in sitemap
if (robotsTxt && sitemapXml) {
  const disallowedPaths = [...robotsTxt.matchAll(/^Disallow:\s*(.+)$/gm)]
    .map(m => m[1].trim())
    .filter(p => !p.includes('?')); // skip query-string rules

  for (const path of disallowedPaths) {
    const clean = path.replace(/\/$/, ''); // /admin/ → /admin
    if (sitemapXml.includes(`qitaat.com${clean}`) && !sitemapXml.includes(`qitaat.com${clean}/`)) {
      // Exact match of a disallowed page in sitemap (not a sub-path)
      findings.push({ file: 'public/sitemap.xml', level: 'critical', msg: `sitemap يحتوي "${clean}" وهو محظور في robots.txt!` });
    }
  }

  // Check that /search?q= is disallowed
  if (!robotsTxt.includes('Disallow: /search?q=')) {
    findings.push({ file: 'public/robots.txt', level: 'warn', msg: 'لا يمنع /search?q= (نتائج بحث noindex)' });
  }

  // Check that /compare?ids= is disallowed
  if (!robotsTxt.includes('Disallow: /compare?ids=')) {
    findings.push({ file: 'public/robots.txt', level: 'warn', msg: 'لا يمنع /compare?ids= (مقارنات مؤقتة noindex)' });
  }

  // Check sitemap has compare-profiles
  if (!sitemapXml.includes('compare-profiles')) {
    findings.push({ file: 'public/sitemap.xml', level: 'warn', msg: 'sitemap لا يحتوي /compare-profiles' });
  }

  const issueCount = findings.filter(f => f.file.startsWith('public/')).length;
  if (issueCount === 0) {
    console.log(`   ${c.green}✓${c.reset}  robots.txt و sitemap.xml متطابقان`);
  } else {
    console.log(`   ${c.yellow}⚠${c.reset}  ${issueCount} ملاحظة`);
  }
}

// Check edge function robots has same disallows
if (robotsEdge) {
  if (!robotsEdge.includes('Disallow: /search?q=')) {
    findings.push({ file: 'supabase/functions/robots/index.ts', level: 'warn', msg: 'edge function لا يمنع /search?q=' });
  }
  if (!robotsEdge.includes('Disallow: /compare?ids=')) {
    findings.push({ file: 'supabase/functions/robots/index.ts', level: 'warn', msg: 'edge function لا يمنع /compare?ids=' });
  }
}

// Check edge sitemap has compare-profiles
if (sitemapEdge) {
  if (!sitemapEdge.includes('compare-profiles')) {
    findings.push({ file: 'supabase/functions/sitemap/index.ts', level: 'warn', msg: 'edge sitemap لا يحتوي compare-profiles' });
  }
}

// ── Duplicate canonical detection ────────────────────────
console.log(`\n${c.bold}🔗 فحص canonical مكرّر في الصفحات${c.reset}`);
{
  const allPages = [
    ...PUBLIC_PAGES,
    ...CONDITIONAL_NOINDEX_PAGES,
  ];
  const canonicalMap = new Map(); // canonical domain → [files]

  for (const filePath of allPages) {
    const content = read(filePath);
    if (!content) continue;

    // Extract all hardcoded canonical strings: canonical: 'URL' or canonical: "URL"
    const hardCanonicals = [...content.matchAll(/canonical:\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1]);
    // Extract canonical from template literals: canonical: `URL`
    const templateCanonicals = [...content.matchAll(/canonical:\s*`([^`]+)`/g)].map(m => m[1]);
    // Also look for conditional canonical with base path
    const ternaryCanonicals = [...content.matchAll(/canonical:.*?['"`](https:\/\/qitaat\.com\/[^'"`?]*)['"`]/g)].map(m => m[1]);

    const allCanonicals = [...new Set([...hardCanonicals, ...templateCanonicals, ...ternaryCanonicals])];

    for (const canon of allCanonicals) {
      // Normalize: strip query strings for grouping (base path comparison)
      const basePath = canon.split('?')[0];
      if (!canonicalMap.has(basePath)) canonicalMap.set(basePath, []);
      const entry = canonicalMap.get(basePath);
      if (!entry.includes(filePath)) entry.push(filePath);
    }
  }

  let dupCount = 0;
  for (const [canon, files] of canonicalMap) {
    if (files.length > 1) {
      // Same canonical base in multiple page files is a conflict
      findings.push({
        file: files.join(', '),
        level: 'critical',
        msg: `canonical مكرّر "${canon}" في ${files.length} ملفات: ${files.join(', ')}`,
      });
      console.log(`   ${c.red}✗${c.reset}  ${c.cyan}${canon}${c.reset} → ${files.join(', ')}`);
      dupCount++;
    }
  }
  if (dupCount === 0) {
    console.log(`   ${c.green}✓${c.reset}  لا canonical مكرّر`);
  }
}

console.log(`\n${c.bold}${'═'.repeat(55)}${c.reset}`);
const criticals = findings.filter(f => f.level === 'critical');
const warns = findings.filter(f => f.level === 'warn');

if (findings.length === 0) {
  console.log(`${c.green}${c.bold}✅ نظيف — لا تعارضات noindex/canonical${c.reset}\n`);
  process.exit(0);
}

if (criticals.length > 0) {
  console.log(`\n${c.red}${c.bold}❌ تعارضات حرجة (${criticals.length})${c.reset}`);
  for (const f of criticals) {
    console.log(`   ${c.red}✗${c.reset} ${c.cyan}${f.file}${c.reset}: ${f.msg}`);
  }
}
if (warns.length > 0) {
  console.log(`\n${c.yellow}${c.bold}⚠ تحذيرات (${warns.length})${c.reset}`);
  for (const f of warns) {
    console.log(`   ${c.yellow}⚠${c.reset} ${c.cyan}${f.file}${c.reset}: ${f.msg}`);
  }
}

console.log();
process.exit(criticals.length > 0 ? 1 : 0);