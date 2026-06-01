import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

describe('useVisibleModules — sidebar alias coverage', () => {
  const src = readFileSync('src/hooks/useVisibleModules.ts', 'utf8');

  it.each([
    ['analytics', '/dashboard/analytics'],
    ['activity_log', '/dashboard/operations/feed'],
    ['private_sectors', '/dashboard/private-sectors'],
    ['installments', '/dashboard/installments'],
    ['staff', '/dashboard/settings/staff'],
  ])('module %s maps to sidebar route %s', (key, route) => {
    const re = new RegExp(`${key}:\\s*\\[[^\\]]*${route.replace(/\//g, '\\/')}`);
    expect(src).toMatch(re);
  });
});