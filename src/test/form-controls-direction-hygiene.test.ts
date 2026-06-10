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