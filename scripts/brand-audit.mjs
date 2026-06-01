#!/usr/bin/env node
/**
 * Brand Audit — يفحص بقايا العلامة التجارية القديمة (faneen / فنيين / FANEEN)
 * في الملفات الحساسة لـ SEO والإيميلات والروابط الداخلية.
 *
 * يعمل في:
 *   - prebuild (محلياً وفي CI)
 *   - npm run audit:brand
 *
 * Exit codes:
 *   0  → نظيف ✅
 *   1  → اكتُشفت بقايا حرجة ❌ (يكسر البناء)
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

// ── ألوان طرفية ─────────────────────────────────────────
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
}

// ── الأنماط الممنوعة ────────────────────────────────────
const FORBIDDEN_PATTERNS = [
  { pattern: /faneen\.com/gi,           label: 'رابط faneen.com',         critical: true },
  { pattern: /faneen\.lovable/gi,       label: 'رابط faneen.lovable',     critical: true },
  { pattern: /\bFANEEN\b/g,             label: 'FANEEN (uppercase)',      critical: true },
  { pattern: /\bFaneen\b/g,             label: 'Faneen (PascalCase)',     critical: true },
  { pattern: /فنيين|فنين/g,             label: 'الاسم العربي القديم',     critical: true },
]

// مفاتيح localStorage مُسموح بها (للحفاظ على جلسات المستخدمين)
const ALLOWED_FANEEN_KEYS = [
  "'faneen_lang'",
  "'faneen_search_history'",
]

// ── الملفات والمجلدات الحرجة المراد فحصها ──────────────
const CRITICAL_FILES = [
  'index.html',
  'public/robots.txt',
  'public/sitemap.xml',
  'public/llms.txt',
  'src/hooks/usePageMeta.ts',
  'vite.config.ts',
  'supabase/functions/sitemap/index.ts',
]

const SCAN_DIRS = [
  'src',
  'public',
  'supabase/functions',
]

const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.lock'])
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.next', 'build', 'coverage'])

// ملفات مُستثناة عمداً (تذكر تاريخياً النطاق القديم لشرح تنظيف البيانات)
const ALLOWED_FILES = new Set([
  'src/pages/Privacy.tsx',
  // Audit guards — these files intentionally mention legacy names to detect leaks.
  // Do NOT add user-facing source paths (src/pages, src/components, src/modules,
  // supabase/functions, public/, email/notification templates) here.
  'src/tests/supabaseDatabaseDeepRepair1.test.ts',
  'src/tests/brandAuditFalsePositive.test.ts',
  'scripts/brand-audit.mjs',
])

// ── جامع الملفات ────────────────────────────────────────
function* walk(dir) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) yield* walk(full)
    else if (!SKIP_EXT.has(extname(name).toLowerCase())) yield full
  }
}

// ── الفحص الأساسي ───────────────────────────────────────
const findings = []
const scannedFiles = new Set()

function scanFile(absPath) {
  if (scannedFiles.has(absPath)) return
  scannedFiles.add(absPath)

  let content
  try { content = readFileSync(absPath, 'utf8') } catch { return }

  const rel = relative(ROOT, absPath)
  if (ALLOWED_FILES.has(rel)) return

  for (const { pattern, label, critical } of FORBIDDEN_PATTERNS) {
    pattern.lastIndex = 0
    const lines = content.split('\n')
    lines.forEach((line, idx) => {
      const localPattern = new RegExp(pattern.source, pattern.flags)
      const matches = [...line.matchAll(localPattern)]
      if (matches.length === 0) return

      // استثناء مفاتيح localStorage المعتمدة
      const isAllowedKey = ALLOWED_FANEEN_KEYS.some((k) => line.includes(k))
      if (isAllowedKey) return

      findings.push({
        file: rel,
        line: idx + 1,
        snippet: line.trim().slice(0, 140),
        label,
        critical,
      })
    })
  }
}

// ── التشغيل ─────────────────────────────────────────────
console.log(`\n${c.bold}${c.cyan}🔍 Brand Audit — فحص بقايا الاسم القديم${c.reset}`)
console.log(`${c.dim}   البحث عن: faneen.com · faneen.lovable · FANEEN · Faneen · فنيين · فنين${c.reset}\n`)

// 1) فحص الملفات الحرجة أولاً
console.log(`${c.bold}📋 الملفات الحرجة (SEO/Sitemap/Robots/Meta)${c.reset}`)
for (const rel of CRITICAL_FILES) {
  const abs = join(ROOT, rel)
  if (!existsSync(abs)) {
    console.log(`   ${c.yellow}⚠${c.reset}  ${rel} — ${c.dim}غير موجود${c.reset}`)
    continue
  }
  const beforeCount = findings.length
  scanFile(abs)
  const newFindings = findings.length - beforeCount
  const icon = newFindings === 0 ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`
  console.log(`   ${icon}  ${rel}${newFindings > 0 ? ` ${c.red}(${newFindings} نتيجة)${c.reset}` : ''}`)
}

// 2) مسح كامل لشجرة المصدر
console.log(`\n${c.bold}🌳 مسح شامل لـ src/ و public/ و supabase/functions/${c.reset}`)
const startDeep = findings.length
for (const dir of SCAN_DIRS) {
  for (const file of walk(join(ROOT, dir))) scanFile(file)
}
const deepCount = findings.length - startDeep
console.log(`   ${c.dim}تم فحص ${scannedFiles.size} ملف${c.reset}`)

// 3) التقرير النهائي
console.log(`\n${c.bold}${'═'.repeat(60)}${c.reset}`)
console.log(`${c.bold}📊 التقرير النهائي${c.reset}`)
console.log(`${c.bold}${'═'.repeat(60)}${c.reset}\n`)

if (findings.length === 0) {
  console.log(`${c.green}${c.bold}✅ نظيف — صفر بقايا للاسم القديم${c.reset}`)
  console.log(`${c.dim}   مفاتيح localStorage المُستثناة مقصودة لحفظ جلسات المستخدمين الحاليين.${c.reset}\n`)
  process.exit(0)
}

// تجميع حسب النوع
const byLabel = findings.reduce((acc, f) => {
  ;(acc[f.label] ??= []).push(f)
  return acc
}, {})

for (const [label, items] of Object.entries(byLabel)) {
  console.log(`${c.red}${c.bold}❌ ${label}${c.reset} ${c.dim}(${items.length})${c.reset}`)
  for (const f of items.slice(0, 10)) {
    console.log(`   ${c.cyan}${f.file}:${f.line}${c.reset}  ${c.dim}${f.snippet}${c.reset}`)
  }
  if (items.length > 10) console.log(`   ${c.dim}... و ${items.length - 10} نتيجة أخرى${c.reset}`)
  console.log()
}

const criticalCount = findings.filter((f) => f.critical).length
console.log(`${c.bold}${c.red}❌ المجموع: ${findings.length} نتيجة (${criticalCount} حرجة)${c.reset}`)
console.log(`${c.yellow}   البناء سيُلغى. يرجى إصلاح البقايا أعلاه قبل المتابعة.${c.reset}\n`)

process.exit(criticalCount > 0 ? 1 : 0)