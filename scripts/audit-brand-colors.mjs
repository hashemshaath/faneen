#!/usr/bin/env node
/**
 * Brand Color Audit
 * ─────────────────
 * Read-only scanner that flags hardcoded colors / disallowed Tailwind classes
 * / gradients across the codebase, classifying each finding so the team can
 * prioritise real fixes vs. justified exceptions.
 *
 * Usage:  node scripts/audit-brand-colors.mjs
 * Never  modifies files. Always exits 0 (advisory).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'supabase/functions', 'public'];
const SCAN_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss', '.html']);
const IGNORE_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', 'coverage', '.git',
  '.lovable', '.cache', '.turbo', '.parcel-cache', 'playwright-report',
]);

// ── Allowed palette (from src/config/brandTheme.ts) ──────────────────────
const ALLOWED_BRAND_HEX = new Set([
  // colors
  '#0E9E6F','#0A7E58','#E6F7F0','#075E42',
  '#2F62AE','#234E8C','#EAF0FA','#142D52',
  '#F08A24','#D17008','#FCE7CE',
  '#F7F8FA','#FFFFFF','#F2F4F8',
  '#1A2230','#6B7689','#94A0B2',
  '#E2E6EE','#C2CAD6',
  '#B45309','#C42626','#131722',
  // status tints
  '#9DD8BD','#FEF3C7','#F4C77B','#7C3A05',
  '#FDECEC','#F1A7A7','#7A1212',
  '#A6BFE3',
  '#EDEFF3','#DDE2EA','#4B5566',
  '#FFF6E5','#9C1212',
  // Email-only soft status tints (mirrors EMAIL_TINTS in supabase/functions/_shared/brandTheme.ts)
  '#EEF1F6','#E6F5EE','#FBEEDC','#E6EEF8','#F8E1E1',
]);

// Official third-party brand colors (justified)
const OFFICIAL_BRAND_HEX = new Map([
  ['#4285F4','Google blue'],
  ['#34A853','Google green'],
  ['#EA4335','Google red'],
  ['#FBBC05','Google yellow'],
  ['#25D366','WhatsApp green'],
  ['#1877F2','Facebook blue'],
  ['#0A66C2','LinkedIn blue'],
  ['#26A5E4','Telegram blue'],
  ['#0088CC','Telegram blue (legacy)'],
  ['#1DA1F2','Twitter/X blue'],
  ['#FF0000','YouTube red'],
]);

// Forbidden legacy palette (always category A)
const FORBIDDEN_HEX = new Set([
  '#14B481','#1FBA82','#178A60','#2D54C4','#1F3D99','#1A2240',
  '#D4A017','#F59E0B','#FBBF24','#8B5CF6','#06B6D4','#EC4899',
  '#10B981','#3B82F6','#2563EB','#EF4444',
]);

// Disallowed Tailwind class fragments (substring match within class strings)
const TW_BAD_PREFIXES = [
  'bg-amber','text-amber','border-amber','from-amber','via-amber','to-amber',
  'bg-yellow','text-yellow','border-yellow','from-yellow','via-yellow','to-yellow',
  'bg-orange','text-orange','border-orange','from-orange','via-orange','to-orange',
  'bg-purple','text-purple','border-purple','from-purple','via-purple','to-purple',
  'bg-pink','text-pink','border-pink','from-pink','via-pink','to-pink',
  'bg-cyan','text-cyan','border-cyan','from-cyan','via-cyan','to-cyan',
  'bg-blue-500','text-blue-500','bg-green-500','text-green-500',
];

const GRADIENT_PATTERNS = [
  { re: /linear-gradient\s*\(/gi,  reason: 'CSS linear-gradient — use solid brand tokens' },
  { re: /radial-gradient\s*\(/gi,  reason: 'CSS radial-gradient — use solid brand tokens' },
  { re: /\bgradient-gold\b/g,      reason: 'legacy gradient utility (gold)' },
  { re: /\bgradient-navy\b/g,      reason: 'legacy gradient utility (navy)' },
  { re: /\bbg-gradient-gold\b/g,   reason: 'legacy gradient utility' },
  { re: /\bbg-gradient-navy\b/g,   reason: 'legacy gradient utility' },
];

const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

// ── File walker ──────────────────────────────────────────────────────────
function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (IGNORE_DIRS.has(name)) continue;
    const full = join(dir, name);
    let st; try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) walk(full, out);
    else if (SCAN_EXT.has(extname(name))) out.push(full);
  }
  return out;
}

// ── Classify a hex finding ───────────────────────────────────────────────
function normHex(hex) {
  let h = hex.toUpperCase();
  if (h.length === 4) {
    // expand #RGB → #RRGGBB
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (h.length === 9) h = h.slice(0, 7); // drop alpha for membership check
  return h;
}

function classifyHex(hex, ctx) {
  const norm = normHex(hex);
  if (FORBIDDEN_HEX.has(norm)) return { cat: 'A', reason: 'forbidden legacy palette color', suggest: 'replace with brandTheme token' };
  if (ALLOWED_BRAND_HEX.has(norm)) return { cat: 'D', reason: 'matches brandTheme literal (acceptable but prefer import)', suggest: 'import from src/config/brandTheme.ts' };
  if (OFFICIAL_BRAND_HEX.has(norm)) return { cat: 'B', reason: `official ${OFFICIAL_BRAND_HEX.get(norm)}`, suggest: 'keep — third-party brand color' };
  if (norm === '#000000' || norm === '#FFFFFF') return { cat: 'C', reason: 'pure black/white — usually technical (PDF / contrast)', suggest: 'keep if PDF/print/fallback' };
  if (ctx.isComment) return { cat: 'D', reason: 'inside comment — not used at runtime', suggest: 'remove from comment if obsolete' };
  return { cat: 'A', reason: 'arbitrary hex not in brand palette', suggest: 'use brandTheme token or CSS variable' };
}

function lineIsComment(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('<!--');
}

// ── Main scan ────────────────────────────────────────────────────────────
const findings = [];
const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));

for (const file of files) {
  // Skip the audit script and the brand source-of-truth file itself
  const rel = relative(ROOT, file).split(sep).join('/');
  if (rel === 'scripts/audit-brand-colors.mjs') continue;
  if (rel === 'src/config/brandTheme.ts') continue;
  if (rel === 'supabase/functions/_shared/brandTheme.ts') continue;

  let txt;
  try { txt = readFileSync(file, 'utf8'); } catch { continue; }
  const lines = txt.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isComment = lineIsComment(line);

    // 1) HEX
    HEX_RE.lastIndex = 0;
    let m;
    while ((m = HEX_RE.exec(line)) !== null) {
      const hex = m[0];
      const cls = classifyHex(hex, { isComment });
      findings.push({ file: rel, line: i + 1, snippet: line.trim().slice(0, 160), match: hex, ...cls });
    }

    // 2) Tailwind bad prefixes — only inside class-like strings
    for (const frag of TW_BAD_PREFIXES) {
      // word-boundary-ish: preceded by start/space/quote, followed by space/quote/end/colon/-modifier
      const re = new RegExp(`(?:^|[\\s"'\\\`/{:])(${frag.replace(/[-]/g, '\\-')})(?:[\\s"'\\\`/}\\-:]|$)`, 'g');
      if (re.test(line)) {
        findings.push({
          file: rel, line: i + 1, snippet: line.trim().slice(0, 160), match: frag,
          cat: isComment ? 'D' : 'A',
          reason: 'disallowed Tailwind palette utility',
          suggest: 'use semantic tokens (primary/secondary/accent/muted/destructive)',
        });
      }
    }

    // 3) Gradients
    for (const { re, reason } of GRADIENT_PATTERNS) {
      re.lastIndex = 0;
      let g;
      while ((g = re.exec(line)) !== null) {
        findings.push({
          file: rel, line: i + 1, snippet: line.trim().slice(0, 160), match: g[0],
          cat: isComment ? 'D' : 'A', reason, suggest: 'use solid brand tokens (no gradients in PDF/email/brand surfaces)',
        });
      }
    }
  }
}

// ── Report ───────────────────────────────────────────────────────────────
const buckets = { A: [], B: [], C: [], D: [] };
for (const f of findings) buckets[f.cat].push(f);

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', cyan: '\x1b[36m', gray: '\x1b[90m',
};

console.log(`${C.bold}${C.cyan}Brand Color Audit${C.reset}`);
console.log(`${C.gray}Scanned ${files.length} files in: ${SCAN_DIRS.join(', ')}${C.reset}`);
console.log('');
console.log(`${C.bold}Total findings: ${findings.length}${C.reset}`);
console.log(`  ${C.red}A — real violation:${C.reset}            ${buckets.A.length}`);
console.log(`  ${C.green}B — official 3rd-party brand:${C.reset}  ${buckets.B.length}`);
console.log(`  ${C.yellow}C — technical (#000/#FFF in PDF):${C.reset} ${buckets.C.length}`);
console.log(`  ${C.dim}D — comment / brand-literal:${C.reset}    ${buckets.D.length}`);
console.log('');

function printGroup(label, list, max) {
  if (!list.length) return;
  console.log(`${C.bold}── ${label} (${list.length}) ──${C.reset}`);
  const slice = max ? list.slice(0, max) : list;
  for (const f of slice) {
    console.log(`  ${C.cyan}${f.file}:${f.line}${C.reset}  ${C.bold}${f.match}${C.reset}  ${C.gray}— ${f.reason}${C.reset}`);
    console.log(`    ${C.dim}${f.snippet}${C.reset}`);
    console.log(`    ${C.gray}→ ${f.suggest}${C.reset}`);
  }
  if (max && list.length > max) console.log(`  ${C.dim}… +${list.length - max} more${C.reset}`);
  console.log('');
}

printGroup('A — Real violations (TOP 10)', buckets.A, 10);
printGroup('B — Official 3rd-party brand colors', buckets.B, 20);
printGroup('C — Technical pure black/white', buckets.C, 10);

// File-level hot spots for category A
if (buckets.A.length) {
  const counts = new Map();
  for (const f of buckets.A) counts.set(f.file, (counts.get(f.file) || 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  console.log(`${C.bold}Top files by category-A violations:${C.reset}`);
  for (const [file, n] of top) console.log(`  ${C.red}${n}${C.reset}  ${file}`);
  console.log('');
}

console.log(`${C.dim}Read-only scan complete. No files were modified.${C.reset}`);
process.exit(0);