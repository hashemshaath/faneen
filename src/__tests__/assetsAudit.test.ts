import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const SELF = 'src/__tests__/assetsAudit.test.ts';

const rg = (pattern: string): string[] => {
  try {
    const out = execSync(`rg -n --no-heading ${JSON.stringify(pattern)} src/ supabase/ index.html`, {
      cwd: root,
      encoding: 'utf8',
    });
    return out
      .split('\n')
      .filter((line) => line && !line.startsWith(SELF));
  } catch {
    return [];
  }
};

const DELETED_ASSETS = [
  'src/assets/auth-slide-1.jpg',
  'src/assets/auth-slide-2.jpg',
  'src/assets/auth-slide-3.jpg',
  'src/assets/cat-accessories.webp',
  'src/assets/cat-designers.webp',
  'src/assets/cat-energy.webp',
  'src/assets/cat-facades.webp',
  'src/assets/cat-gypsum.webp',
  'src/assets/hero-slide-2.jpg',
  'src/assets/hero-slide-3.jpg',
  'src/assets/home/hero-facade.webp',
] as const;

// Basenames whose removal must not leave dangling source references.
const DELETED_BASENAMES = [
  'auth-slide-1',
  'auth-slide-2',
  'auth-slide-3',
  'cat-accessories',
  'cat-designers',
  'cat-energy',
  'cat-facades',
  'cat-gypsum',
  'hero-facade',
] as const;

// Assets confirmed in use — must remain present.
const KEEP_ASSETS = [
  'src/assets/home/hero-slide-1.webp',
  'src/assets/home/hero-slide-2.webp',
  'src/assets/home/hero-slide-3.webp',
  'src/assets/home/hero-slide-4.webp',
  'src/assets/cat-aluminum.webp',
  'src/assets/cat-glass.webp',
  'src/assets/cat-iron.webp',
  'src/assets/cat-wood.webp',
  'src/assets/logo-full.png',
  'src/assets/logo-full-light.png',
  'src/assets/logo-mark.png',
  'src/assets/fonts/NotoNaskhArabic-Regular.ttf',
  'src/assets/fonts/NotoNaskhArabic-Bold.ttf',
  'src/assets/private-sectors/crystal-glass.jpg',
  'src/assets/private-sectors/royal-kitchens.jpg',
  'src/assets/private-sectors/saraya-aluminum.jpg',
] as const;

describe('src/assets/** orphan cleanup', () => {
  it('each deleted asset file is gone', () => {
    for (const p of DELETED_ASSETS) {
      expect(existsSync(join(root, p)), `${p} should be deleted`).toBe(false);
    }
  });

  it('no source file references any deleted asset basename', () => {
    for (const name of DELETED_BASENAMES) {
      const hits = rg(name);
      expect(hits, `${name} still referenced in:\n${hits.join('\n')}`).toEqual([]);
    }
  });

  // The .jpg fallbacks for hero-slide-2/3 were deleted; the .webp must remain.
  it('hero-slide jpg fallbacks are removed but webp originals remain', () => {
    expect(existsSync(join(root, 'src/assets/hero-slide-2.jpg'))).toBe(false);
    expect(existsSync(join(root, 'src/assets/hero-slide-3.jpg'))).toBe(false);
    expect(existsSync(join(root, 'src/assets/hero-slide-2.webp'))).toBe(true);
    expect(existsSync(join(root, 'src/assets/hero-slide-3.webp'))).toBe(true);
  });

  it('confirmed in-use assets remain present', () => {
    for (const p of KEEP_ASSETS) {
      expect(existsSync(join(root, p)), `${p} must remain`).toBe(true);
    }
  });
});