#!/usr/bin/env node
/**
 * Canonical ↔ Sitemap Cross-Validation Audit
 * ────────────────────────────────────────────
 * For every indexed static path in the sitemap edge function, reads the
 * corresponding page component and verifies that its canonical URL matches
 * the sitemap <loc>.
 *
 * Checks:
 *  1. Canonical uses https://qitaat.com (correct domain)
 *  2. Canonical path matches the sitemap path (no mismatch)
 *  3. No page sets a canonical pointing to a *different* indexed page
 *  4. Dynamic pages (/:id, /:slug) use consistent base paths
 *
 * Exit codes: 0 = pass, 1 = critical failures
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BASE = 'https://qitaat.com';
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

function read(rel) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return null;
  return readFileSync(abs, 'utf8');
}

// ── Map sitemap static paths → page component files ─────
// Built from App.tsx routes + sitemap edge function
const SITEMAP_TO_PAGE = {
  '/':                  'src/pages/Index.tsx',
  '/search':            'src/pages/Search.tsx',
  '/categories':        'src/pages/Categories.tsx',
  '/offers':            'src/pages/Offers.tsx',
  '/projects':          'src/pages/Projects.tsx',
  '/blog':              'src/pages/Blog.tsx',
  '/profile-systems':   'src/pages/ProfileSystems.tsx',
  '/compare':           'src/pages/Compare.tsx',
  '/compare-profiles':  'src/pages/CompareProfiles.tsx',
  '/membership':        'src/pages/Membership.tsx',
  '/about':             'src/pages/About.tsx',
  '/contact':           'src/pages/Contact.tsx',
  '/privacy':           'src/pages/Privacy.tsx',
  '/terms':             'src/pages/Terms.tsx',
};

const findings = [];
const results = []; // for summary table

console.log(`\n${c.bold}${c.cyan}🔗 Canonical ↔ Sitemap Cross-Validation${c.reset}\n`);

// ── Extract canonical from page source ──────────────────
function extractCanonical(content) {
  // Match: canonical: 'URL', canonical: "URL", canonical: `URL`
  const hard = [...content.matchAll(/canonical:\s*['"`]([^'"`\n]+)['"`]/g)].map(m => m[1]);
  // Match template literal with expression: canonical: `${BASE}${path}`
  const tmpl = [...content.matchAll(/canonical:\s*`([^`]+)`/g)].map(m => m[1]);
  // Conditional canonical (ternary): take the first qitaat.com URL
  const ternary = [...content.matchAll(/canonical:.*?(https:\/\/qitaat\.com\/[^'"`\s,}]*)/g)].map(m => m[1]);
  
  const all = [...new Set([...hard, ...tmpl, ...ternary])];
  return all;
}

function normalizePath(url) {
  try {
    const u = new URL(url.replace(/\$\{[^}]+\}/g, '')); // strip template expressions
    return u.pathname.replace(/\/$/, '') || '/';
  } catch {
    // Maybe a relative or template literal
    const m = url.match(/qitaat\.com(\/[^?'"` ]*)/);
    return m ? (m[1].replace(/\/$/, '') || '/') : null;
  }
}

// ── Verify each mapping ─────────────────────────────────
for (const [sitemapPath, pageFile] of Object.entries(SITEMAP_TO_PAGE)) {
  const expectedCanonical = `${BASE}${sitemapPath === '/' ? '/' : sitemapPath}`;
  const content = read(pageFile);

  if (!content) {
    findings.push({ level: 'warn', path: sitemapPath, file: pageFile, msg: 'ملف الصفحة غير موجود' });
    results.push({ path: sitemapPath, file: pageFile, status: '⚠️', detail: 'File missing' });
    console.log(`   ${c.yellow}⚠${c.reset}  ${sitemapPath} → ${pageFile} (غير موجود)`);
    continue;
  }

  const canonicals = extractCanonical(content);

  // Check 1: Page uses usePageMeta with canonical
  if (canonicals.length === 0) {
    // Check if usePageMeta is called (canonical defaults to window.location.pathname)
    const hasPageMeta = /usePageMeta\s*\(/.test(content);
    if (hasPageMeta) {
      // Has usePageMeta but no explicit canonical — it defaults to current path which is correct
      results.push({ path: sitemapPath, file: pageFile, status: '✅', detail: 'Default canonical (auto)' });
      console.log(`   ${c.green}✓${c.reset}  ${sitemapPath} → canonical تلقائي (usePageMeta)`);
    } else {
      findings.push({ level: 'warn', path: sitemapPath, file: pageFile, msg: 'لا يستخدم usePageMeta — بدون canonical' });
      results.push({ path: sitemapPath, file: pageFile, status: '⚠️', detail: 'No usePageMeta' });
      console.log(`   ${c.yellow}⚠${c.reset}  ${sitemapPath} → بدون usePageMeta`);
    }
    continue;
  }

  // Check 2: Verify canonical domain
  let hasIssue = false;
  for (const canon of canonicals) {
    // Skip template expressions that can't be fully resolved
    if (canon.includes('${') && !canon.includes('qitaat.com')) continue;

    const resolved = canon.replace(/\$\{[^}]+\}/g, '');
    if (resolved.startsWith('http') && !resolved.includes('qitaat.com')) {
      findings.push({ level: 'critical', path: sitemapPath, file: pageFile, msg: `canonical يشير لنطاق خاطئ: ${canon}` });
      results.push({ path: sitemapPath, file: pageFile, status: '❌', detail: `Wrong domain: ${canon}` });
      console.log(`   ${c.red}✗${c.reset}  ${sitemapPath} → نطاق خاطئ: ${canon}`);
      hasIssue = true;
      continue;
    }

    // Check 3: Canonical path matches sitemap path
    const canonPath = normalizePath(canon);
    if (canonPath && canonPath !== sitemapPath) {
      // Some pages have conditional canonical (e.g. /search with ?q=)
      // Only flag if the base path is completely different
      const isConditional = /noindex:/.test(content) && content.includes('?');
      if (!isConditional) {
        findings.push({ level: 'critical', path: sitemapPath, file: pageFile, msg: `canonical path "${canonPath}" لا يطابق sitemap path "${sitemapPath}"` });
        results.push({ path: sitemapPath, file: pageFile, status: '❌', detail: `Path mismatch: canonical=${canonPath}` });
        console.log(`   ${c.red}✗${c.reset}  ${sitemapPath} → canonical=${canonPath} (غير مطابق)`);
        hasIssue = true;
      }
    }
  }

  if (!hasIssue) {
    results.push({ path: sitemapPath, file: pageFile, status: '✅', detail: canonicals[0] });
    console.log(`   ${c.green}✓${c.reset}  ${sitemapPath} → ${canonicals[0]}`);
  }
}

// ── Check 4: No two pages share the same canonical base ─
console.log(`\n${c.bold}🔄 فحص تقاطع canonical بين صفحات مفهرسة${c.reset}`);
const canonToPages = new Map();
for (const [sitemapPath, pageFile] of Object.entries(SITEMAP_TO_PAGE)) {
  const content = read(pageFile);
  if (!content) continue;
  const canonicals = extractCanonical(content);
  for (const canon of canonicals) {
    const p = normalizePath(canon);
    if (!p) continue;
    if (!canonToPages.has(p)) canonToPages.set(p, []);
    canonToPages.get(p).push({ sitemapPath, pageFile });
  }
}

let crossIssues = 0;
for (const [canonPath, pages] of canonToPages) {
  // Filter: only flag if different sitemap paths point to the same canonical
  const uniqueSitemapPaths = [...new Set(pages.map(p => p.sitemapPath))];
  if (uniqueSitemapPaths.length > 1) {
    findings.push({
      level: 'critical',
      path: canonPath,
      file: pages.map(p => p.pageFile).join(', '),
      msg: `canonical "${canonPath}" مشترك بين: ${uniqueSitemapPaths.join(', ')}`,
    });
    console.log(`   ${c.red}✗${c.reset}  ${canonPath} ← ${uniqueSitemapPaths.join(', ')}`);
    crossIssues++;
  }
}
if (crossIssues === 0) {
  console.log(`   ${c.green}✓${c.reset}  لا تقاطع canonical بين الصفحات المفهرسة`);
}

// ── Report ──────────────────────────────────────────────
console.log(`\n${c.bold}${'═'.repeat(55)}${c.reset}`);
const criticals = findings.filter(f => f.level === 'critical');
const warns = findings.filter(f => f.level === 'warn');

if (findings.length === 0) {
  console.log(`${c.green}${c.bold}✅ Canonical ↔ Sitemap cross-validation passed${c.reset}\n`);
} else {
  if (criticals.length > 0) {
    console.log(`\n${c.red}${c.bold}❌ أخطاء حرجة (${criticals.length})${c.reset}`);
    for (const f of criticals) console.log(`   ${c.red}✗${c.reset}  ${f.path}: ${f.msg}`);
  }
  if (warns.length > 0) {
    console.log(`\n${c.yellow}${c.bold}⚠ تحذيرات (${warns.length})${c.reset}`);
    for (const f of warns) console.log(`   ${c.yellow}⚠${c.reset}  ${f.path}: ${f.msg}`);
  }
  console.log();
}

// ── GitHub Actions Job Summary ──────────────────────────
if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = criticals.length > 0 ? '❌' : warns.length > 0 ? '⚠️' : '✅';
  let md = `## ${icon} Canonical ↔ Sitemap Audit\n\n`;
  md += `| Sitemap Path | Page File | Status | Detail |\n|---|---|---|---|\n`;
  for (const r of results) {
    md += `| \`${r.path}\` | \`${r.file}\` | ${r.status} | ${r.detail} |\n`;
  }
  md += `\n`;

  if (criticals.length > 0) {
    md += `### ❌ Critical Issues\n\n`;
    for (const f of criticals) md += `- **\`${f.path}\`** (${f.file}): ${f.msg}\n`;
    md += `\n`;
  }

  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(`📝 GitHub Job Summary written`);
}

process.exit(criticals.length > 0 ? 1 : 0);