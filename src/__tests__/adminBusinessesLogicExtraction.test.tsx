import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Phase 5G — Admin Businesses Logic Extraction guard.
 *
 * Verifies that the branch-form state, the admin-activity logger
 * and supporting helpers were lifted out of AdminBusinesses.tsx
 * without regressing the size ceiling, the route, or any of the
 * panel compositions that previous phases established.
 */
const repo = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.join(repo, p));

const PAGE = 'src/pages/admin/AdminBusinesses.tsx';
const ROUTES = 'src/App.tsx';

const NEW_FILES = [
  'src/pages/admin/businesses/hooks/useBusinessBranchFormState.ts',
  'src/pages/admin/businesses/logAdminBusinessAction.ts',
];

const FORBIDDEN_SUBSTRINGS = [
  '@ts-ignore',
  '@ts-expect-error',
  '@ts-nocheck',
  'eslint-disable',
];

describe('AdminBusinesses Phase 5G logic extraction', () => {
  it('new extracted modules exist on disk', () => {
    for (const p of NEW_FILES) {
      expect(exists(p), `missing ${p}`).toBe(true);
    }
  });

  it('AdminBusinesses.tsx stays under the 1550-line ceiling', () => {
    const lines = read(PAGE).split('\n').length;
    expect(lines).toBeLessThanOrEqual(1550);
  });

  it('/admin/businesses route is still registered', () => {
    if (!exists(ROUTES)) return; // route may live in a different shell
    const src = read(ROUTES);
    expect(src).toMatch(/admin\/businesses/);
  });

  it('page wires the extracted branch-form hook + payload helper', () => {
    const src = read(PAGE);
    expect(src).toMatch(/useBusinessBranchFormState\(/);
    expect(src).toMatch(/buildBranchPayload\(/);
  });

  it('page wires the extracted admin activity logger', () => {
    const src = read(PAGE);
    expect(src).toMatch(/logAdminBusinessAction\(/);
  });

  it('create / edit / branch / tabs composition is still mounted', () => {
    const src = read(PAGE);
    expect(src).toMatch(/<BusinessCreatePanel\b/);
    expect(src).toMatch(/<BusinessEditPanel\b/);
    expect(src).toMatch(/<BusinessBranchesSection\b/);
    expect(src).toMatch(/<BusinessPublicVisibilityCard\b/);
  });

  it('no DB / RLS / migration / edge surface introduced here', () => {
    for (const p of NEW_FILES) {
      const src = read(p);
      expect(src).not.toMatch(/supabase\.rpc\(/);
      expect(src).not.toMatch(/CREATE\s+POLICY/i);
      expect(src).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION/i);
    }
  });

  it('no suppressions in the extracted modules', () => {
    for (const p of NEW_FILES) {
      const src = read(p);
      for (const tok of FORBIDDEN_SUBSTRINGS) {
        expect(src.includes(tok), `${p} contains ${tok}`).toBe(false);
      }
    }
  });

  it('no `any` or `as any` in the extracted modules', () => {
    for (const p of NEW_FILES) {
      const src = read(p);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/as\s+any\b/);
    }
  });

  it('no hardcoded hex colors in the extracted modules', () => {
    for (const p of NEW_FILES) {
      const src = read(p);
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});