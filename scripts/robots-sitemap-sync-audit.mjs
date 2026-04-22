#!/usr/bin/env node
/**
 * Robots ↔ Sitemap Single-Source-of-Truth Audit
 * ──────────────────────────────────────────────
 * يتحقق أن الملفات الأربعة (robots.txt ثابت + edge، sitemap.xml ثابت + edge)
 * تنطلق من مصدر حقيقة واحد ولا تتعارض عند تعديل أنواع المحتوى.
 *
 * الفحوصات:
 *  1. قواعد Disallow متطابقة بين robots.txt الثابت و edge function
 *  2. قواعد Allow متطابقة بين robots.txt الثابت و edge function
 *  3. Sitemap directives متطابقة بين الملفين
 *  4. كل مسار Allow في robots موجود في sitemap edge function
 *  5. كل مسار Disallow في robots لا يظهر في sitemap static paths
 *  6. أنواع المحتوى الديناميكية (businesses/blog/...) لها مسارات Allow مقابلة
 *  7. لا يوجد مسار يظهر في Allow و Disallow معاً (تعارض)
 *
 * Exit codes: 0 = pass, 1 = critical
 */
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

function read(rel) {
  const abs = join(ROOT, rel);
  return existsSync(abs) ? readFileSync(abs, 'utf8') : null;
}

const findings = [];
const report = { disallowDrift: [], allowDrift: [], sitemapDrift: [], conflicts: [], missingInSitemap: [], leakedInSitemap: [] };

console.log(`\n${c.bold}${c.cyan}🔄 Robots ↔ Sitemap Single-Source-of-Truth Audit${c.reset}\n`);

const robotsStatic = read('public/robots.txt');
const robotsEdge = read('supabase/functions/robots/index.ts');
const sitemapStatic = read('public/sitemap.xml');
const sitemapEdge = read('supabase/functions/sitemap/index.ts');

if (!robotsStatic || !sitemapStatic) {
  console.log(`${c.red}✗ public/robots.txt أو public/sitemap.xml غير موجود${c.reset}`);
  process.exit(1);
}

// ── Helpers: extract rules from robots content ──────────
function extractRules(text, directive) {
  const re = new RegExp(`^${directive}:\\s*(.+)$`, 'gm');
  return [...text.matchAll(re)].map(m => m[1].trim());
}

function extractFromEdgeRobots(code) {
  // The DEFAULT_ROBOTS template literal in the edge function
  const tmpl = code.match(/DEFAULT_ROBOTS\s*=\s*`([\s\S]*?)`/);
  return tmpl ? tmpl[1] : null;
}

// ── 1. Extract rules from static robots.txt ─────────────
// Only look at rules under "User-agent: *" (first block)
const staticDisallow = extractRules(robotsStatic, 'Disallow');
const staticAllow = extractRules(robotsStatic, 'Allow');
const staticSitemapDirs = extractRules(robotsStatic, 'Sitemap');

console.log(`${c.bold}📋 robots.txt الثابت${c.reset}`);
console.log(`   Allow: ${staticAllow.length} | Disallow: ${staticDisallow.length} | Sitemap: ${staticSitemapDirs.length}`);

// ── 2. Extract rules from edge robots function ──────────
console.log(`\n${c.bold}⚡ Edge robots function${c.reset}`);
let edgeDisallow = [], edgeAllow = [], edgeSitemapDirs = [];

if (robotsEdge) {
  const edgeBody = extractFromEdgeRobots(robotsEdge);
  if (edgeBody) {
    edgeDisallow = extractRules(edgeBody, 'Disallow');
    edgeAllow = extractRules(edgeBody, 'Allow');
    edgeSitemapDirs = extractRules(edgeBody, 'Sitemap');
    console.log(`   Allow: ${edgeAllow.length} | Disallow: ${edgeDisallow.length} | Sitemap: ${edgeSitemapDirs.length}`);
  } else {
    findings.push({ level: 'warn', msg: 'لم يتم استخراج DEFAULT_ROBOTS من edge function' });
    console.log(`   ${c.yellow}⚠${c.reset}  لم يتم استخراج القالب`);
  }
} else {
  findings.push({ level: 'warn', msg: 'supabase/functions/robots/index.ts غير موجود' });
  console.log(`   ${c.yellow}⚠${c.reset}  غير موجود`);
}

// ── 3. Compare Disallow rules ───────────────────────────
console.log(`\n${c.bold}🚫 مقارنة قواعد Disallow${c.reset}`);
if (edgeDisallow.length > 0) {
  const missingInEdge = staticDisallow.filter(d => !edgeDisallow.includes(d));
  const extraInEdge = edgeDisallow.filter(d => !staticDisallow.includes(d));

  for (const d of missingInEdge) {
    findings.push({ level: 'critical', msg: `Disallow "${d}" في robots.txt الثابت لكن مفقود في edge function` });
    report.disallowDrift.push({ rule: d, where: 'static_only' });
    console.log(`   ${c.red}✗${c.reset}  "${d}" → في الثابت فقط`);
  }
  for (const d of extraInEdge) {
    findings.push({ level: 'critical', msg: `Disallow "${d}" في edge function لكن مفقود في robots.txt الثابت` });
    report.disallowDrift.push({ rule: d, where: 'edge_only' });
    console.log(`   ${c.red}✗${c.reset}  "${d}" → في edge فقط`);
  }
  if (missingInEdge.length === 0 && extraInEdge.length === 0) {
    console.log(`   ${c.green}✓${c.reset}  متطابقة (${staticDisallow.length} قاعدة)`);
  }
} else {
  console.log(`   ${c.yellow}⚠${c.reset}  تخطي — edge function غير متاح`);
}

// ── 4. Compare Allow rules ──────────────────────────────
console.log(`\n${c.bold}✅ مقارنة قواعد Allow${c.reset}`);
if (edgeAllow.length > 0) {
  // Static has more granular Allow rules; edge has broad "Allow: /"
  // Flag critical paths missing from edge
  const CRITICAL_ALLOW = ['/', '/categories/', '/search'];
  for (const ca of CRITICAL_ALLOW) {
    const inStatic = staticAllow.some(a => a === ca || a.startsWith(ca));
    const inEdge = edgeAllow.some(a => a === ca || a.startsWith(ca));
    if (inStatic && !inEdge) {
      // Edge has "Allow: /" which covers everything, so this is fine
      if (!edgeAllow.includes('/')) {
        findings.push({ level: 'warn', msg: `Allow "${ca}" في الثابت لكن مفقود في edge (بدون Allow: / عام)` });
        report.allowDrift.push({ rule: ca, where: 'static_only' });
        console.log(`   ${c.yellow}⚠${c.reset}  "${ca}" → في الثابت فقط`);
      }
    }
  }
  console.log(`   ${c.green}✓${c.reset}  قواعد Allow الأساسية مغطاة`);
} else {
  console.log(`   ${c.yellow}⚠${c.reset}  تخطي — edge function غير متاح`);
}

// ── 5. Compare Sitemap directives ───────────────────────
console.log(`\n${c.bold}🗺️  مقارنة Sitemap directives${c.reset}`);
if (edgeSitemapDirs.length > 0) {
  // Normalize: edge might use ${BASE} template
  const normalize = s => s.replace(/\$\{BASE\}/g, 'https://qitaat.com').trim();
  const edgeNorm = edgeSitemapDirs.map(normalize);
  const staticNorm = staticSitemapDirs.map(s => s.trim());

  const missingInEdge = staticNorm.filter(s => !edgeNorm.includes(s));
  const extraInEdge = edgeNorm.filter(s => !staticNorm.includes(s));

  for (const s of missingInEdge) {
    findings.push({ level: 'critical', msg: `Sitemap "${s}" في الثابت لكن مفقود في edge` });
    report.sitemapDrift.push({ url: s, where: 'static_only' });
    console.log(`   ${c.red}✗${c.reset}  "${s}" → في الثابت فقط`);
  }
  for (const s of extraInEdge) {
    findings.push({ level: 'critical', msg: `Sitemap "${s}" في edge لكن مفقود في الثابت` });
    report.sitemapDrift.push({ url: s, where: 'edge_only' });
    console.log(`   ${c.red}✗${c.reset}  "${s}" → في edge فقط`);
  }
  if (missingInEdge.length === 0 && extraInEdge.length === 0) {
    console.log(`   ${c.green}✓${c.reset}  متطابقة (${staticNorm.length} directive)`);
  }
} else {
  console.log(`   ${c.yellow}⚠${c.reset}  تخطي — edge function غير متاح`);
}

// ── 6. Every Allow path in robots must exist in sitemap ─
console.log(`\n${c.bold}🔗 Allow paths مغطاة في sitemap${c.reset}`);
if (sitemapEdge) {
  // Extract static paths from sitemap edge function
  const sitemapStaticPaths = [...sitemapEdge.matchAll(/loc:\s*"([^"]+)"/g)].map(m => m[1]);
  // Normalize: strip leading slash, match flexibility
  const normalizedSitemapPaths = sitemapStaticPaths.map(p => p.replace(/^\//, ''));

  // Check only meaningful Allow paths (not "/", not query-string rules)
  const meaningfulAllows = staticAllow
    .filter(a => a !== '/' && !a.includes('?') && !a.endsWith('$'))
    .map(a => a.replace(/\/$/, ''));

  for (const allow of meaningfulAllows) {
    const cleanPath = allow.replace(/^\//, '');
    const inSitemap = sitemapEdge.includes(allow) ||
      normalizedSitemapPaths.some(sp => sp === cleanPath || sp.startsWith(cleanPath + '/'));
    if (!inSitemap) {
      findings.push({ level: 'warn', msg: `Allow "${allow}" غير مغطى في sitemap edge function` });
      report.missingInSitemap.push(allow);
      console.log(`   ${c.yellow}⚠${c.reset}  "${allow}" → غير موجود في sitemap`);
    }
  }
  if (report.missingInSitemap.length === 0) {
    console.log(`   ${c.green}✓${c.reset}  جميع Allow paths مغطاة (${meaningfulAllows.length} مسار)`);
  }
} else {
  console.log(`   ${c.yellow}⚠${c.reset}  تخطي — sitemap edge غير متاح`);
}

// ── 7. Disallowed paths must NOT appear in sitemap ──────
console.log(`\n${c.bold}🛡️  Disallow paths لا تظهر في sitemap static paths${c.reset}`);
if (sitemapEdge) {
  const sitemapPaths = [...sitemapEdge.matchAll(/loc:\s*"([^"]+)"/g)].map(m => m[1]);

  for (const disallow of staticDisallow) {
    // Skip query-string disallows (they block specific params, not the base path)
    if (disallow.includes('?')) continue;
    const cleanD = disallow.replace(/\/$/, '');

    for (const sp of sitemapPaths) {
      if (sp === cleanD || sp.startsWith(cleanD + '/')) {
        findings.push({ level: 'critical', msg: `مسار sitemap "${sp}" محظور بواسطة Disallow "${disallow}"` });
        report.leakedInSitemap.push({ path: sp, disallowRule: disallow });
        console.log(`   ${c.red}✗${c.reset}  "${sp}" ← Disallow "${disallow}"`);
      }
    }
  }
  if (report.leakedInSitemap.length === 0) {
    console.log(`   ${c.green}✓${c.reset}  لا تسريب — المسارات المحظورة لا تظهر في sitemap`);
  }
}

// ── 8. Detect Allow/Disallow conflicts ──────────────────
console.log(`\n${c.bold}⚡ كشف تعارض Allow/Disallow${c.reset}`);
const conflictChecks = staticAllow
  .filter(a => a !== '/' && !a.endsWith('$'))
  .map(a => a.replace(/\/$/, ''));

let conflictCount = 0;
for (const allow of conflictChecks) {
  const conflicting = staticDisallow.find(d => d === allow);
  if (conflicting) {
    // Exact same rule in both Allow and Disallow — real conflict
    findings.push({ level: 'critical', msg: `تعارض: Allow "${allow}" و Disallow "${conflicting}" نفس القاعدة بالضبط` });
    report.conflicts.push({ allow, disallow: conflicting });
    console.log(`   ${c.red}✗${c.reset}  Allow "${allow}" ↔ Disallow "${conflicting}"`);
    conflictCount++;
  }
}
if (conflictCount === 0) {
  console.log(`   ${c.green}✓${c.reset}  لا تعارضات بين Allow و Disallow`);
}

// ── 9. Content type routes: dynamic types have matching Allow ─
console.log(`\n${c.bold}📂 أنواع المحتوى الديناميكية مغطاة في robots Allow${c.reset}`);
if (sitemapEdge) {
  const CONTENT_TYPE_ROUTES = {
    businesses: '/:username',
    blog: '/blog/',
    categories: '/categories/',
    profiles: '/profile-systems/',
    projects: '/projects/',
  };

  for (const [type, route] of Object.entries(CONTENT_TYPE_ROUTES)) {
    const typeInEdge = new RegExp(`type\\s*===\\s*["']${type}["']`).test(sitemapEdge);
    if (!typeInEdge) continue;

    const routeBase = route.replace(/\/:.*/, '/').replace(/\/$/, '');
    const covered = routeBase === '' || // /:username maps to root
      staticAllow.some(a => a === '/' || a.startsWith(routeBase));

    if (covered) {
      console.log(`   ${c.green}✓${c.reset}  ${type} → ${route || '/'}`);
    } else {
      findings.push({ level: 'warn', msg: `نوع "${type}" (${route}) غير مغطى بقاعدة Allow في robots.txt` });
      console.log(`   ${c.yellow}⚠${c.reset}  ${type} → ${route} (غير مغطى)`);
    }
  }
}

// ── Report ──────────────────────────────────────────────
console.log(`\n${c.bold}${'═'.repeat(55)}${c.reset}`);
const criticals = findings.filter(f => f.level === 'critical');
const warns = findings.filter(f => f.level === 'warn');

if (findings.length === 0) {
  console.log(`${c.green}${c.bold}✅ Robots ↔ Sitemap sync audit passed${c.reset}\n`);
} else {
  if (criticals.length > 0) {
    console.log(`\n${c.red}${c.bold}❌ أخطاء حرجة (${criticals.length})${c.reset}`);
    for (const f of criticals) console.log(`   ${c.red}✗${c.reset}  ${f.msg}`);
  }
  if (warns.length > 0) {
    console.log(`\n${c.yellow}${c.bold}⚠ تحذيرات (${warns.length})${c.reset}`);
    for (const f of warns) console.log(`   ${c.yellow}⚠${c.reset}  ${f.msg}`);
  }
  console.log();
}

// ── GitHub Actions Job Summary ──────────────────────────
if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = criticals.length > 0 ? '❌' : warns.length > 0 ? '⚠️' : '✅';
  let md = `## ${icon} Robots ↔ Sitemap Sync Report\n\n`;
  md += `| Check | Result |\n|---|---|\n`;
  md += `| Disallow drift | ${report.disallowDrift.length === 0 ? '✅ Synced' : `❌ ${report.disallowDrift.length} drifts`} |\n`;
  md += `| Sitemap directives | ${report.sitemapDrift.length === 0 ? '✅ Synced' : `❌ ${report.sitemapDrift.length} drifts`} |\n`;
  md += `| Allow/Disallow conflicts | ${report.conflicts.length === 0 ? '✅ None' : `❌ ${report.conflicts.length}`} |\n`;
  md += `| Disallow leaked in sitemap | ${report.leakedInSitemap.length === 0 ? '✅ None' : `❌ ${report.leakedInSitemap.length}`} |\n`;
  md += `| Missing Allow in sitemap | ${report.missingInSitemap.length === 0 ? '✅ All covered' : `⚠️ ${report.missingInSitemap.length}`} |\n`;
  md += `| Critical | ${criticals.length} |\n`;
  md += `| Warnings | ${warns.length} |\n\n`;

  if (report.disallowDrift.length > 0) {
    md += `### 🚫 Disallow Drift\n\n| Rule | Location |\n|---|---|\n`;
    for (const d of report.disallowDrift) md += `| \`${d.rule}\` | ${d.where} |\n`;
    md += `\n`;
  }
  if (report.sitemapDrift.length > 0) {
    md += `### 🗺️ Sitemap Directive Drift\n\n| URL | Location |\n|---|---|\n`;
    for (const s of report.sitemapDrift) md += `| \`${s.url}\` | ${s.where} |\n`;
    md += `\n`;
  }
  if (report.leakedInSitemap.length > 0) {
    md += `### 🛡️ Disallowed Paths in Sitemap\n\n| Path | Disallow Rule |\n|---|---|\n`;
    for (const l of report.leakedInSitemap) md += `| \`${l.path}\` | \`${l.disallowRule}\` |\n`;
    md += `\n`;
  }

  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
  console.log(`📝 GitHub Job Summary written`);
}

process.exit(criticals.length > 0 ? 1 : 0);