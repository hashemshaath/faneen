import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Global Forms RTL/LTR Hotfix guard.
 *
 * Shared form primitives must route through the central direction resolver
 * and must not hardcode physical text alignment that fights RTL.
 */
const PRIMITIVES = [
  'src/components/ui/input.tsx',
  'src/components/ui/textarea.tsx',
];

describe('Form primitives — direction wiring', () => {
  for (const f of PRIMITIVES) {
    const src = readFileSync(join(process.cwd(), f), 'utf8');

    it(`${f} uses resolveFieldDirection`, () => {
      expect(src).toMatch(/resolveFieldDirection/);
    });

    it(`${f} does not contain text-left in className`, () => {
      expect(src).not.toMatch(/\btext-left\b/);
    });
  }
});

describe('Select primitive — logical spacing', () => {
  const f = 'src/components/ui/select.tsx';
  const src = readFileSync(join(process.cwd(), f), 'utf8');

  it('SelectItem/SelectLabel use logical padding (ps-*/pe-*)', () => {
    expect(src).toMatch(/\bps-8\b/);
    expect(src).toMatch(/\bpe-2\b/);
  });

  it('SelectItem does not hardcode text-left', () => {
    expect(src).not.toMatch(/\btext-left\b/);
  });
});

describe('/quote — Arabic placeholders follow UI direction', () => {
  const f = 'src/pages/Quote.tsx';
  const src = readFileSync(join(process.cwd(), f), 'utf8');

  it('does not leave Arabic placeholder fields on dir="auto" when empty', () => {
    for (const id of ['q-city', 'q-district', 'q-desc', 'q-meas', 'q-qty']) {
      const block = src.match(new RegExp(`id="${id}"[\\s\\S]{0,260}`))?.[0] ?? '';
      expect(block, `${id} should use UI direction for empty placeholder alignment`).toMatch(/dir=\{isRTL \? 'rtl' : 'ltr'\}/);
      expect(block, `${id} should not use dir auto`).not.toMatch(/dir="auto"/);
    }
  });

  it('keeps technical contact and budget fields LTR', () => {
    expect(src).toMatch(/id="q-phone"[\s\S]{0,180}dir="ltr"/);
    expect(src).toMatch(/id="q-email"[\s\S]{0,180}dir="ltr"/);
    expect(src).toMatch(/id="q-budget"[\s\S]{0,180}inputMode="numeric"/);
    expect(src).not.toMatch(/[٠-٩]/);
  });
});