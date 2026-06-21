/**
 * DASHBOARD CONTRACTS PAGE EXTRACTION — closeout guard.
 *
 * Locks in the safe extraction of `stats` + `filtered` derivations from
 * DashboardContracts.tsx into `useContractListDerivations`, and asserts
 * that no contract behaviour-sensitive concerns were touched.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const PAGE = path.resolve(__dirname, '../pages/dashboard/DashboardContracts.tsx');
const HOOK = path.resolve(__dirname, '../hooks/useContractListDerivations.ts');

function read(p: string): string {
  return fs.readFileSync(p, 'utf8');
}

describe('Dashboard Contracts — page extraction closeout', () => {
  it('DashboardContracts.tsx exists and is under the previous size cap', () => {
    expect(fs.existsSync(PAGE)).toBe(true);
    const lines = read(PAGE).split('\n').length;
    // Was 3192 before extraction. Lock to a ceiling that proves the cut.
    expect(lines).toBeLessThan(3192);
  });

  it('useContractListDerivations hook exists and exports the derivation API', () => {
    expect(fs.existsSync(HOOK)).toBe(true);
    const src = read(HOOK);
    expect(src).toMatch(/export\s+function\s+useContractListDerivations/);
    expect(src).toMatch(/getContractHealth/);
  });

  it('hook is wired into the page', () => {
    const src = read(PAGE);
    expect(src).toMatch(/from\s+['"]@\/hooks\/useContractListDerivations['"]/);
    expect(src).toMatch(/useContractListDerivations\(\s*\{/);
  });

  it('hook does not perform DB / RPC / mutation work', () => {
    const src = read(HOOK);
    for (const forbidden of [
      '@/integrations/supabase',
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

  it('canonical contract status source remains the label source of truth', () => {
    const src = read(PAGE);
    expect(src).toMatch(/from\s+['"]@\/lib\/contract-statuses['"]/);
    expect(src.includes('getContractStatusMeta')).toBe(true);
  });

  it('sensitive imports (mutations, attachments, invitations, amendments) still present', () => {
    const src = read(PAGE);
    for (const needle of [
      '@/modules/contracts/services/mutations',
      '@/modules/contracts/services/attachments',
      '@/modules/contracts/services/invitations',
      '@/modules/contracts/services/amendments',
      '@/modules/contracts/services/childTables',
      '@/modules/contracts/services/createContractFromTemplate',
    ]) {
      expect(src.includes(needle), `page must still import ${needle}`).toBe(true);
    }
  });

  it('page does not introduce DB migration / RLS / edge function references', () => {
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

  it('contract action handlers still exist on the page', () => {
    const src = read(PAGE);
    for (const needle of [
      'acceptContract',
      'sendContractForApproval',
      'cloneContractAsDraft',
      'createClientInvitation',
    ]) {
      expect(src.includes(needle), `page must still wire ${needle}`).toBe(true);
    }
  });

  it('dashboard contracts route is registered in App.tsx', () => {
    const app = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
    expect(app.includes('DashboardContracts')).toBe(true);
  });
});