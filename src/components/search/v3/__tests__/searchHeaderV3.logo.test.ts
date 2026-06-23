import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', '..', '..', '..', rel), 'utf8');

describe('SearchHeaderV3 — logo navigation closeout', () => {
  const header = read('components/search/v3/SearchHeaderV3.tsx');
  const navbar = read('components/layout/Navbar.tsx');

  it('mounts the public Navbar (which carries the central LogoLink)', () => {
    expect(header).toMatch(/from\s+['"]@\/components\/layout\/Navbar['"]/);
    expect(header).toMatch(/<Navbar\s*\/>/);
  });

  it('Navbar uses the central LogoLink with surface="public" routing to /', () => {
    expect(navbar).toMatch(/from\s+['"]@\/components\/common\/LogoLink['"]/);
    expect(navbar).toMatch(/<LogoLink[\s\S]*?surface=["']public["']/);
    expect(navbar).not.toMatch(/href=["']#["']/);
  });

  it('SearchHeaderV3 does not introduce a second LogoLink (no double tracking)', () => {
    const matches = header.match(/<LogoLink/g) ?? [];
    expect(matches.length).toBe(0);
  });
});