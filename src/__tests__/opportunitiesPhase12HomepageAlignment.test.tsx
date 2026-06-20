import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const HOME = readFileSync(resolve(ROOT, 'src/components/home/v2/HomeV2.tsx'), 'utf8');
const APP = readFileSync(resolve(ROOT, 'src/App.tsx'), 'utf8');

describe('Opportunities Phase 12 — homepage alignment', () => {
  it('1. homepage primary CTA uses opportunity-aligned copy', () => {
    // Phase 12B — primary conversion CTA must speak opportunity language.
    expect(HOME).toMatch(/ابدأ فرصة|أنشئ فرصة|اطرح فرصتك/);
  });
  it('2. /quote CTA target is still wired', () => {
    expect(HOME).toMatch(/quote:\s*['"]\/quote['"]/);
  });
  it('3. /quote route is still registered', () => {
    expect(APP).toContain('path="/quote"');
  });
  it('4. sectors + categories routes still registered (unchanged)', () => {
    for (const p of ['/sectors', '/categories']) {
      expect(APP).toContain(`path="${p}"`);
    }
  });
  it('5. no hardcoded hex colors introduced on the home component', () => {
    expect(HOME).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });
  it('6. homepage does NOT keep "اطلب عرض سعر مجانًا" as a primary CTA label', () => {
    // The label may not appear as a `label={bi(...)}` argument anymore.
    expect(HOME).not.toMatch(/label=\{bi\('اطلب عرض سعر مجانًا'/);
  });
});