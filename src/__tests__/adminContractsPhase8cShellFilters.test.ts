/**
 * Phase 8C — Admin Contracts shell + filters adoption guard.
 *
 * Verifies that the new shell/filters primitives exist, that
 * `AdminContracts.tsx` adopts them, and that the new components remain
 * pure UI (no Supabase, no queries, no mutations, no PDF/hash/signature
 * coupling, no `any` suppressions).
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHARED_DIR = path.resolve(__dirname, '../components/admin/contracts/shared');
const PAGE_FILE = path.resolve(__dirname, '../pages/admin/AdminContracts.tsx');
const APP_TSX = path.resolve(__dirname, '../App.tsx');
const LIB_DIR = path.resolve(__dirname, '../lib');

const NEW_COMPONENT_FILES = [
  'ContractAdminPageShell.tsx',
  'ContractFiltersBar.tsx',
];

function read(p: string): string {
  return fs.readFileSync(p, 'utf8');
}

describe('Phase 8C — admin contracts shell + filters', () => {
  it('new primitives exist on disk and are barreled', () => {
    for (const f of NEW_COMPONENT_FILES) {
      expect(fs.existsSync(path.join(SHARED_DIR, f))).toBe(true);
    }
    const barrel = read(path.join(SHARED_DIR, 'index.ts'));
    expect(barrel).toMatch(/\bContractAdminPageShell\b/);
    expect(barrel).toMatch(/\bContractFiltersBar\b/);
  });

  it('AdminContracts.tsx adopts ContractAdminPageShell, ContractFiltersBar, ContractStatsStrip, ContractStatusBadge', () => {
    const page = read(PAGE_FILE);
    expect(page.includes('ContractAdminPageShell')).toBe(true);
    expect(page.includes('ContractFiltersBar')).toBe(true);
    expect(page.includes('ContractStatsStrip')).toBe(true);
    expect(page.includes('ContractStatusBadge')).toBe(true);
  });

  it('new primitives never import Supabase or contract execution services', () => {
    const forbidden = [
      '@/integrations/supabase',
      '@/modules/contracts/services',
      '@/services',
      'businessService',
      'contract-pdf',
      'contract-hash',
      'contract-qr',
      'contract-signature',
    ];
    for (const f of NEW_COMPONENT_FILES) {
      const src = read(path.join(SHARED_DIR, f));
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('new primitives contain no queries or mutations', () => {
    const forbiddenTokens = [
      'useQuery(',
      'useMutation(',
      'useInfiniteQuery(',
      '.from(',
      'supabase',
      'adminCreateContractOnBehalf',
    ];
    for (const f of NEW_COMPONENT_FILES) {
      const src = read(path.join(SHARED_DIR, f));
      for (const t of forbiddenTokens) {
        expect(src.includes(t), `${f} must not contain ${t}`).toBe(false);
      }
    }
  });

  it('new primitives contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of NEW_COMPONENT_FILES) {
      expect(hex.test(read(path.join(SHARED_DIR, f))), `${f} has hex`).toBe(false);
    }
  });

  it('new primitives have no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of NEW_COMPONENT_FILES) {
      const src = read(path.join(SHARED_DIR, f));
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore')).toBe(false);
      expect(src.includes('@ts-expect-error')).toBe(false);
      expect(src.includes('eslint-disable')).toBe(false);
    }
  });

  it('getContractStatusMeta remains the canonical label source', () => {
    const statuses = read(path.join(LIB_DIR, 'contract-statuses.ts'));
    expect(statuses.includes('export function getContractStatusMeta')).toBe(true);
    expect(statuses.includes('export type ContractStatus')).toBe(true);
    const filters = read(path.join(SHARED_DIR, 'ContractFiltersBar.tsx'));
    expect(filters.includes('getContractStatusMeta')).toBe(true);
  });

  it('legacy redirects in App.tsx remain intact', () => {
    const app = read(APP_TSX);
    expect(app.includes('<Navigate')).toBe(true);
  });

  it('contract pdf / hash / qr / signature libs remain on disk and untouched by the new files', () => {
    const survivors = fs
      .readdirSync(LIB_DIR)
      .filter((f) => /^contract-(pdf|hash|qr|signature)/.test(f));
    expect(survivors.length).toBeGreaterThan(0);
  });

  it('AdminContracts.tsx still owns the data query (no query relocation)', () => {
    const page = read(PAGE_FILE);
    expect(page.includes('useQuery')).toBe(true);
    expect(page.includes("from('contracts')")).toBe(true);
  });
});