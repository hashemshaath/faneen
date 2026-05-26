import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';

/**
 * RTL-LTR-CODE-CLEANUP-AND-CENTRAL-AUDIT-1 — centralized strict audit.
 *
 * Scans production source files under src and fails on any
 * direction-physical Tailwind utility / inline style that should have a
 * logical equivalent. Vendored shadcn primitives in `src/components/ui/`
 * and CSS/docs files are allowlisted because the patterns appear there in
 * comments or canonical Tailwind APIs.
 *
 * Replacement guide:
 *   text-left/right       → text-start / text-end
 *   ml-N / mr-N           → ms-N / me-N
 *   pl-N / pr-N           → ps-N / pe-N
 *   left-N / right-N      → start-N / end-N
 *   border-l / border-r   → border-s / border-e
 *   rounded-l / rounded-r → rounded-s / rounded-e
 *   space-x-N             → gap-N (preferred) or ms-/me- spacing
 *   float-left/right      → float-start / float-end
 *   rtl:left/right        → start / end (Tailwind 3.3+ supports logical insets)
 */

const ROOT = resolve(__dirname, '..', '..');
const SRC = resolve(ROOT, 'src');

/** Files/dirs that are allowed to use physical direction utilities. Each
 *  entry MUST include a reason — entries become stale if the file disappears. */
interface AllowEntry { path: string; reason: string }
const ALLOWLIST: AllowEntry[] = [
  { path: 'src/components/ui/',                              reason: 'shadcn vendored primitives — canonical Tailwind class names' },
  { path: 'src/styles/',                                     reason: 'design-system documentation, not rendered' },
  { path: 'src/__tests__/rtlLtrCentralAudit.test.ts',        reason: 'this audit references the forbidden patterns by name' },
  { path: 'src/__tests__/rtlLtrDirectionAudit.test.ts',      reason: 'legacy audit; superseded but kept for back-compat' },
];

const isAllowed = (rel: string): boolean =>
  ALLOWLIST.some((e) => rel === e.path || rel.startsWith(e.path));

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
  { name: 'text-left/right',        regex: /\btext-(left|right)\b/ },
  { name: 'ml-N/mr-N',              regex: /\b(ml|mr)-[0-9]/ },
  { name: 'pl-N/pr-N',              regex: /\b(pl|pr)-[0-9]/ },
  { name: 'border-l/r',             regex: /\b(border-l|border-r)\b/ },
  { name: 'rounded-l/r',            regex: /\brounded-(l|r)\b/ },
  { name: 'left-N/right-N (inset)', regex: /(?<![A-Za-z])-?(left|right)-[0-9]/ },
  { name: 'space-x-N',              regex: /\bspace-x-[0-9]/ },
  { name: 'rtl:left/right',         regex: /\brtl:(left|right)-/ },
  { name: 'float-left/right',       regex: /\bfloat-(left|right)\b/ },
  { name: 'inline style left/right',regex: /style=\{\{[^}]*\b(left|right)\s*:/ },
  { name: 'isRTL ternary inline inset', regex: /\[\s*isRTL\s*\?\s*['"](left|right)['"]\s*:\s*['"](left|right)['"]\s*\]/ },
];

describe('RTL/LTR central audit', () => {
  for (const p of PATTERNS) {
    it(`no unsafe ${p.name} outside the allowlist`, () => {
      const offenders: string[] = [];
      for (const f of FILES) {
        const src = readFileSync(f.abs, 'utf8');
        src.split('\n').forEach((ln, i) => {
          if (p.regex.test(ln)) offenders.push(`${f.rel}:${i + 1}  ${ln.trim().slice(0, 160)}`);
        });
      }
      expect(
        offenders,
        `Use logical equivalents. Offenders:\n${offenders.join('\n')}`,
      ).toEqual([]);
    });
  }

  it('every allowlist entry still resolves to a real path', () => {
    const stale: string[] = [];
    for (const e of ALLOWLIST) {
      try { statSync(resolve(ROOT, e.path)); } catch { stale.push(e.path); }
    }
    expect(stale, `Stale allowlist entries: ${stale.join(', ')}`).toEqual([]);
  });

  it('LanguageContext keeps <html dir>/<lang> reactive to language', () => {
    const src = readFileSync(resolve(SRC, 'i18n/LanguageContext.tsx'), 'utf8');
    expect(src).toMatch(/document\.documentElement\.dir\s*=\s*dir/);
    expect(src).toMatch(/document\.documentElement\.lang\s*=\s*language/);
    expect(src).toMatch(/language === 'ar' \? 'rtl' : 'ltr'/);
  });

  it('exposes central direction primitives (CSS + TS)', () => {
    const css = readFileSync(resolve(SRC, 'index.css'), 'utf8');
    for (const cls of ['.technical-ltr', '.bidi-auto', '.bidi-isolate', '.tech-content']) {
      expect(css, `index.css missing ${cls}`).toContain(cls);
    }
    const dir = readFileSync(resolve(SRC, 'lib/direction.ts'), 'utf8');
    expect(dir).toMatch(/export function getDirection/);
    expect(dir).toMatch(/export function isRTL/);
    expect(dir).toMatch(/export function getDocumentLang/);
    expect(dir).toMatch(/RTL_LANGS/);
  });

  it('central direction components exist', () => {
    for (const p of [
      'components/ui/bidi-text.tsx',
      'components/ui/technical-text.tsx',
      'components/ui/reference-text.tsx',
      'components/ui/directional-icon.tsx',
    ]) {
      const src = readFileSync(resolve(SRC, p), 'utf8');
      expect(src.length, `${p} is empty`).toBeGreaterThan(0);
    }
  });
});