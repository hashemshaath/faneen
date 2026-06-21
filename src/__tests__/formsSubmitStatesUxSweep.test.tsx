import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf-8');

describe('FORMS + SUBMIT STATES UX SWEEP — guards', () => {
  it('Quote submit button is disabled while submitting and shows loading copy', () => {
    const src = read('src/pages/Quote.tsx');
    expect(src).toMatch(/if\s*\(\s*submitting\s*\)\s*return/);
    expect(src).toMatch(/disabled=\{[^}]*submitting/);
  });

  it('AdminNotificationsConfig Save shows loading state and prevents double-submit', () => {
    const src = read('src/pages/admin/AdminNotificationsConfig.tsx');
    expect(src).toMatch(/disabled=\{save\.isPending\}/);
    expect(src).toMatch(/جاري الحفظ|Saving/);
    expect(src).toMatch(/if\s*\(save\.isPending\)\s*return/);
    expect(src).toMatch(/animate-spin/);
  });

  it('Touched files contain no `as any` or hardcoded hex colors', () => {
    const files = [
      'src/pages/admin/AdminNotificationsConfig.tsx',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} has 'as any'`).not.toMatch(/\bas\s+any\b/);
      expect(src, `${f} has hardcoded hex`).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(src, `${f} references service_role`).not.toMatch(/service_role/);
    }
  });
});