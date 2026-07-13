/**
 * DASHBOARD RENTALS PAGE EXTRACTION — closeout guard.
 *
 * Locks the safe extraction of order stats + items filter derivations
 * from DashboardRentals.tsx into `useRentalListDerivations`, and
 * asserts no rental behaviour-sensitive concerns were touched.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '../pages/dashboard/DashboardRentals.tsx');
const HOOK = path.resolve(__dirname, '../hooks/useRentalListDerivations.ts');
const APP = path.resolve(__dirname, '../App.tsx');

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('Dashboard Rentals — page extraction closeout', () => {
  it('DashboardRentals.tsx exists and stayed under size cap', () => {
    expect(fs.existsSync(PAGE)).toBe(true);
    const lines = read(PAGE).split('\n').length;
    // T1 — customer request path added a PendingRequestsPanel + intake tab.
    // Cap raised to accommodate the new provider-facing surface (was 2139).
    expect(lines).toBeLessThan(2350);
  });

  it('useRentalListDerivations hook exists and exports the derivation API', () => {
    expect(fs.existsSync(HOOK)).toBe(true);
    const src = read(HOOK);
    expect(src).toMatch(/export\s+function\s+useRentalListDerivations/);
    expect(src).toMatch(/filteredItems/);
    expect(src).toMatch(/stats/);
  });

  it('hook is wired into the page', () => {
    const src = read(PAGE);
    expect(src).toMatch(/from\s+['"]@\/hooks\/useRentalListDerivations['"]/);
    expect(src).toMatch(/useRentalListDerivations\(\s*\{/);
  });

  it('hook performs no DB / RPC / mutation work', () => {
    const src = read(HOOK);
    expect(src.includes("from '@/integrations/supabase/client'")).toBe(false);
    for (const forbidden of [
      'supabase.from(',
      'useQuery(',
      'useMutation(',
      '.rpc(',
    ]) {
      expect(src.includes(forbidden), `hook must not contain ${forbidden}`).toBe(false);
    }
  });

  it('hook contains no any / suppressions / hex colors', () => {
    const src = read(HOOK);
    expect(/\bas\s+any\b/.test(src)).toBe(false);
    expect(/:\s*any\b/.test(src)).toBe(false);
    expect(src.includes('@ts-ignore')).toBe(false);
    expect(src.includes('@ts-expect-error')).toBe(false);
    expect(src.includes('eslint-disable')).toBe(false);
    expect(/#[0-9a-fA-F]{3,8}\b/.test(src)).toBe(false);
  });

  it('sensitive rentals imports remain on the page', () => {
    const src = read(PAGE);
    for (const needle of [
      '@/modules/rentals',
      'RentalItems',
      'RentalOrders',
      'RentalCategories',
    ]) {
      expect(src.includes(needle), `page must still import ${needle}`).toBe(true);
    }
  });

  it('status labels and badges remain the source of truth', () => {
    const src = read(PAGE);
    expect(src.includes('ITEM_STATUS_LABELS')).toBe(true);
    expect(src.includes('RentalStatusBadge')).toBe(true);
  });

  it('page does not introduce DB migration / RLS / edge references', () => {
    const src = read(PAGE);
    for (const forbidden of [
      'service_role',
      'pg_policies',
      'supabase/migrations',
      'supabase/functions',
    ]) {
      expect(src.includes(forbidden), `page must not reference ${forbidden}`).toBe(false);
    }
  });

  it('dashboard rentals route is still registered in App.tsx', () => {
    const app = read(APP);
    expect(app).toMatch(/path="\/dashboard\/rentals"/);
  });
});