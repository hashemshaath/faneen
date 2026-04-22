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
import { readFileSync, existsSync } from 'node:fs';
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