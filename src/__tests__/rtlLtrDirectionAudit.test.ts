import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

/**
 * RTL-LTR-SYSTEM-AUDIT-AND-FIX-1.
 *
 * Static guard that prevents new direction-physical Tailwind utilities from
 * leaking into application code. The allowlist below covers:
 *  - shadcn/ui primitives in src/components/ui/* (vendored — Tailwind's own
 *    physical class names are part of the canonical API and we don't
 *    re-author them)
 *  - markdown / docs files in src/styles/
 *  - this audit file itself
 *
 * Any new occurrence of `text-left|text-right|ml-N|mr-N|pl-N|pr-N|border-l|
 * border-r|rounded-l*|rounded-r*` in application source must be rewritten
 * using logical equivalents (text-start, text-end, ms-N, me-N, ps-N, pe-N,
 * border-s, border-e, rounded-s*, rounded-e*).
 */

const ROOT = resolve(__dirname, '..', '..');
const SRC = resolve(ROOT, 'src');

const ALLOWED_DIR_PREFIXES = [
  // Shadcn vendored primitives — keep canonical Tailwind class names.
  'src/components/ui/',
  // Design-system documentation references (not rendered).
  'src/styles/',
  // Tests and audits (this file references the forbidden patterns by name).
  'src/__tests__/rtlLtrDirectionAudit.test.ts',
];

const isAllowed = (rel: string) =>
  ALLOWED_DIR_PREFIXES.some((p) => rel === p || rel.startsWith(p));

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      walk(full, out);
    } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

const FILES = walk(SRC)
  .map((f) => ({ abs: f, rel: relative(ROOT, f).replace(/\\/g, '/') }))
  .filter((f) => !isAllowed(f.rel));

interface Pattern { name: string; regex: RegExp }
const PATTERNS: Pattern[] = [
  { name: 'text-left/right', regex: /\btext-(left|right)\b/ },
  { name: 'ml-N/mr-N',       regex: /\b(ml|mr)-[0-9]/ },
  { name: 'pl-N/pr-N',       regex: /\b(pl|pr)-[0-9]/ },
  { name: 'border-l/r',      regex: /\b(border-l|border-r)\b/ },
  { name: 'rounded-l/r',     regex: /\brounded-(l|r)\b/ },
  { name: 'left-N/right-N (inset)', regex: /(?<![A-Za-z])-?(left|right)-[0-9]/ },
  { name: 'space-x-N',       regex: /\bspace-x-[0-9]/ },
  { name: 'rtl:left/right',  regex: /\brtl:(left|right)-/ },
];

describe('RTL/LTR direction audit (static)', () => {
  for (const p of PATTERNS) {
    it(`no unsafe ${p.name} outside the shadcn/ui allowlist`, () => {
      const offenders: string[] = [];
      for (const f of FILES) {
        const src = readFileSync(f.abs, 'utf8');
        const lines = src.split('\n');
        lines.forEach((ln, i) => {
          if (p.regex.test(ln)) offenders.push(`${f.rel}:${i + 1}  ${ln.trim().slice(0, 160)}`);
        });
      }
      expect(offenders, `Use logical equivalents (ms-/me-/ps-/pe-/text-start/text-end/border-s/border-e). Offenders:\n${offenders.join('\n')}`).toEqual([]);
    });
  }

  it('LanguageContext sets <html dir> and <html lang> reactively', () => {
    const src = readFileSync(resolve(SRC, 'i18n/LanguageContext.tsx'), 'utf8');
    expect(src).toMatch(/document\.documentElement\.dir\s*=\s*dir/);
    expect(src).toMatch(/document\.documentElement\.lang\s*=\s*language/);
    expect(src).toMatch(/language === 'ar' \? 'rtl' : 'ltr'/);
  });

  it('exposes .tech-content as the LTR-forced helper for reference IDs', () => {
    const css = readFileSync(resolve(SRC, 'index.css'), 'utf8');
    expect(css).toMatch(/\.tech-content/);
  });
});