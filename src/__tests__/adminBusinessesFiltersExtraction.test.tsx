import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  filterAndSortBusinesses,
  computeBusinessStats,
  computeTierDistribution,
} from '@/pages/admin/businesses/businessListDerivations';
import { TIERS } from '@/pages/admin/businesses/_shared';

/**
 * Phase 5H — filters + list state extraction guard.
 *
 * Verifies the new list-state hook + keyboard hook were extracted, the
 * search/filter/reset behaviour for pure derivations is preserved, and
 * no DB/RLS/RPC/edge surface was added in the new modules.
 */
const repo = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.join(repo, p));

const PAGE = 'src/pages/admin/AdminBusinesses.tsx';
const NEW_FILES = [
  'src/pages/admin/businesses/hooks/useAdminBusinessesListState.ts',
  'src/pages/admin/businesses/hooks/useAdminBusinessesKeyboard.ts',
];

type Row = {
  id: string;
  name_ar: string;
  name_en?: string | null;
  username?: string | null;
  ref_id?: string | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  membership_tier?: string | null;
  rating_avg?: number | null;
  created_at: string;
};

const rows: Row[] = [
  { id: '1', name_ar: 'ألفا', name_en: 'Alpha', username: 'alpha', is_active: true,  is_verified: true,  membership_tier: 'premium',    rating_avg: 4, created_at: '2025-01-01' },
  { id: '2', name_ar: 'بيتا', name_en: 'Beta',  username: 'beta',  is_active: false, is_verified: false, membership_tier: 'free',       rating_avg: 2, created_at: '2025-02-01' },
  { id: '3', name_ar: 'جاما', name_en: 'Gamma', username: 'gamma', is_active: true,  is_verified: false, membership_tier: 'enterprise', rating_avg: 5, created_at: '2025-03-01' },
];

const baseFilters = {
  search: '',
  filterStatus: 'all',
  selectedTiers: [] as string[],
  filterTranslation: 'all',
  filterOrigin: 'all',
  sortBy: 'recent' as const,
  language: 'ar' as const,
  contractBusinessIds: [] as string[],
};

describe('AdminBusinesses Phase 5H filters + list state', () => {
  it('extracted hook files exist', () => {
    for (const p of NEW_FILES) expect(exists(p), `missing ${p}`).toBe(true);
  });

  it('AdminBusinesses.tsx is under 1500 lines', () => {
    expect(read(PAGE).split('\n').length).toBeLessThan(1500);
  });

  it('page wires the extracted list-state + keyboard hooks', () => {
    const src = read(PAGE);
    expect(src).toMatch(/useAdminBusinessesListState\(/);
    expect(src).toMatch(/useAdminBusinessesKeyboard\(/);
  });

  it('create / edit / publish surfaces remain mounted', () => {
    const src = read(PAGE);
    expect(src).toMatch(/<BusinessCreatePanel\b/);
    expect(src).toMatch(/<BusinessEditPanel\b/);
    expect(src).toMatch(/<BusinessPublicVisibilityCard\b/);
    expect(src).toMatch(/<BusinessBranchesSection\b/);
  });

  it('search filter narrows the list', () => {
    const out = filterAndSortBusinesses(rows, { ...baseFilters, search: 'beta' });
    expect(out.map((r) => r.id)).toEqual(['2']);
  });

  it('status filter narrows by active/inactive', () => {
    const inactive = filterAndSortBusinesses(rows, { ...baseFilters, filterStatus: 'inactive' });
    expect(inactive.map((r) => r.id)).toEqual(['2']);
    const verified = filterAndSortBusinesses(rows, { ...baseFilters, filterStatus: 'verified' });
    expect(verified.map((r) => r.id)).toEqual(['1']);
  });

  it('tier filter narrows by selected tiers', () => {
    const out = filterAndSortBusinesses(rows, {
      ...baseFilters,
      selectedTiers: ['enterprise', 'premium'],
    });
    expect(out.map((r) => r.id).sort()).toEqual(['1', '3']);
  });

  it('reset (empty filters) restores the full list', () => {
    const out = filterAndSortBusinesses(rows, baseFilters);
    expect(out).toHaveLength(rows.length);
  });

  it('stats + tier distribution are stable derivations', () => {
    const stats = computeBusinessStats(rows, []);
    expect(stats.total).toBe(3);
    const dist = computeTierDistribution(rows, TIERS);
    expect(dist.premium).toBe(1);
    expect(dist.enterprise).toBe(1);
    expect(dist.free).toBe(1);
  });

  it('no DB / RLS / RPC / migration / edge surface in extracted modules', () => {
    for (const p of NEW_FILES) {
      const src = read(p);
      expect(src).not.toMatch(/supabase\.rpc\(/);
      expect(src).not.toMatch(/CREATE\s+POLICY/i);
      expect(src).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION/i);
    }
  });

  it('no any / as any / suppressions in extracted modules', () => {
    for (const p of NEW_FILES) {
      const src = read(p);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/as\s+any\b/);
      expect(src).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
      expect(src).not.toMatch(/eslint-disable/);
    }
  });
});