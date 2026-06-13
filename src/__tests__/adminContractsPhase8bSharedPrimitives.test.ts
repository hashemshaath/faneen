/**
 * Phase 8B — Admin Contracts shared primitives guard.
 *
 * Locks in the presentational contract for the new admin contracts shared
 * primitives and ensures none of them reach into Supabase, contract
 * mutations, PDF/hash/signature pipelines, or redefine the canonical
 * contract status labels.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHARED_DIR = path.resolve(__dirname, '../components/admin/contracts/shared');

const COMPONENT_FILES = [
  'ContractStatusBadge.tsx',
  'ContractLifecycleBadge.tsx',
  'ContractStatsStrip.tsx',
  'index.ts',
];

function read(file: string): string {
  return fs.readFileSync(path.join(SHARED_DIR, file), 'utf8');
}

describe('Phase 8B — admin contracts shared primitives', () => {
  it('all primitives and the barrel exist on disk', () => {
    for (const f of COMPONENT_FILES) {
      expect(fs.existsSync(path.join(SHARED_DIR, f))).toBe(true);
    }
  });

  it('barrel exports every primitive by name', () => {
    const src = read('index.ts');
    for (const sym of ['ContractStatusBadge', 'ContractLifecycleBadge', 'ContractStatsStrip']) {
      expect(src).toMatch(new RegExp(`\\b${sym}\\b`));
    }
  });

  it('shared primitives never import Supabase or contract execution services', () => {
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
    for (const f of COMPONENT_FILES) {
      const src = read(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('shared primitives contain no queries or mutations', () => {
    const forbiddenTokens = [
      'useQuery(',
      'useMutation(',
      'useInfiniteQuery(',
      '.from(',
      'supabase',
      'adminCreateContractOnBehalf',
    ];
    for (const f of COMPONENT_FILES) {
      const src = read(f);
      for (const t of forbiddenTokens) {
        expect(src.includes(t), `${f} must not contain ${t}`).toBe(false);
      }
    }
  });

  it('shared primitives contain no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of COMPONENT_FILES) {
      expect(hex.test(read(f)), `${f} contains a hex color`).toBe(false);
    }
  });

  it('shared primitives contain no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of COMPONENT_FILES) {
      const src = read(f);
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f} has @ts-ignore`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f} has @ts-expect-error`).toBe(false);
      expect(src.includes('eslint-disable'), `${f} has eslint-disable`).toBe(false);
    }
  });

  it('ContractStatusBadge relies on getContractStatusMeta as the label source of truth', () => {
    const src = read('ContractStatusBadge.tsx');
    expect(src.includes('getContractStatusMeta')).toBe(true);
    expect(/from\s+['"]@\/lib\/contract-statuses['"]/.test(src)).toBe(true);
  });

  it('legacy redirect routes in App.tsx remain intact', () => {
    const appTsx = fs.readFileSync(path.resolve(__dirname, '../App.tsx'), 'utf8');
    expect(appTsx.includes('<Navigate')).toBe(true);
  });

  it('contract pdf / hash / signature / qr libs remain intact on disk', () => {
    const libDir = path.resolve(__dirname, '../lib');
    const survivors = fs
      .readdirSync(libDir)
      .filter((f) => /^contract-(pdf|hash|qr|signature|statuses|status-guidance)/.test(f));
    // status source + at least one of pdf/hash/qr/signature must still be present
    expect(survivors.some((f) => f.startsWith('contract-statuses'))).toBe(true);
    expect(
      survivors.some((f) => /^contract-(pdf|hash|qr|signature)/.test(f)),
    ).toBe(true);
  });

  it('canonical contract status source still defines ContractStatus and getContractStatusMeta', () => {
    const statusesSrc = fs.readFileSync(
      path.resolve(__dirname, '../lib/contract-statuses.ts'),
      'utf8',
    );
    expect(statusesSrc.includes('export type ContractStatus')).toBe(true);
    expect(statusesSrc.includes('export function getContractStatusMeta')).toBe(true);
  });

  it('VERSION_STATUS_META source remains intact and untouched in types.ts', () => {
    const typesSrc = fs.readFileSync(
      path.resolve(__dirname, '../components/admin/contract-templates/types.ts'),
      'utf8',
    );
    expect(typesSrc.includes('export const VERSION_STATUS_META')).toBe(true);
  });
});