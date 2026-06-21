import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ADMIN BUSINESSES — PHASE 5K: Cleanup track closeout audit.
 *
 * Locks in the results of phases 5G-5J: the page stays under the
 * 1450-line target, the extracted hooks/components remain on disk
 * and are actually imported, no `any`/suppressions/hex/IDs slipped
 * into the page, and no Supabase/RLS/RPC concerns leaked into
 * presentation files.
 */
const repo = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.join(repo, p));

const PAGE = 'src/pages/admin/AdminBusinesses.tsx';
const EXTRACTED = [
  'src/pages/admin/businesses/hooks/useBusinessBranchFormState.ts',
  'src/pages/admin/businesses/hooks/useAdminBusinessesListState.ts',
  'src/pages/admin/businesses/hooks/useAdminBusinessesKeyboard.ts',
  'src/pages/admin/businesses/components/BusinessBranchesPanel.tsx',
  'src/pages/admin/businesses/components/AdminBusinessesHeader.tsx',
  'src/pages/admin/businesses/logAdminBusinessAction.ts',
] as const;

describe('AdminBusinesses Phase 5K cleanup track closeout', () => {
  it('AdminBusinesses.tsx stays under the 1450-line ceiling', () => {
    expect(read(PAGE).split('\n').length).toBeLessThan(1450);
  });

  it('every extracted hook/component file is present on disk', () => {
    for (const f of EXTRACTED) expect(exists(f), `missing ${f}`).toBe(true);
  });

  it('every extracted file is actually imported by AdminBusinesses.tsx', () => {
    const src = read(PAGE);
    const tokens = [
      'useBusinessBranchFormState',
      'useAdminBusinessesListState',
      'useAdminBusinessesKeyboard',
      'BusinessBranchesPanel',
      'AdminBusinessesHeader',
      'logAdminBusinessAction',
    ];
    for (const t of tokens) expect(src.includes(t), `${t} unused`).toBe(true);
  });

  it('AdminBusinesses page contains no `any` / `as any` / suppressions', () => {
    const src = read(PAGE);
    expect(src).not.toMatch(/\bas\s+any\b/);
    expect(src).not.toMatch(/:\s*any\b/);
    expect(src).not.toMatch(/@ts-ignore|@ts-nocheck|eslint-disable/);
  });

  it('extracted files contain no `any`, suppressions, hex colors, or skipped tests', () => {
    for (const f of EXTRACTED) {
      const src = read(f);
      expect(src, f).not.toMatch(/\bas\s+any\b/);
      expect(src, f).not.toMatch(/:\s*any\b/);
      expect(src, f).not.toMatch(/@ts-ignore|@ts-nocheck|eslint-disable/);
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(src, f).not.toMatch(/\b(it|test|describe)\.skip\b/);
    }
  });

  it('no hardcoded UUIDs leaked into the page or extracted files', () => {
    const uuid = /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/;
    for (const f of [PAGE, ...EXTRACTED]) {
      expect(read(f), f).not.toMatch(uuid);
    }
  });

  it('no service_role reference anywhere in the page or extracted files', () => {
    for (const f of [PAGE, ...EXTRACTED]) {
      expect(read(f), f).not.toMatch(/service_role/);
    }
  });

  it('presentation extractions stay free of Supabase / RPC calls', () => {
    const presentational = [
      'src/pages/admin/businesses/components/AdminBusinessesHeader.tsx',
      'src/pages/admin/businesses/hooks/useAdminBusinessesKeyboard.ts',
      'src/pages/admin/businesses/hooks/useAdminBusinessesListState.ts',
    ];
    for (const f of presentational) {
      const src = read(f);
      expect(src, f).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
      expect(src, f).not.toMatch(/\.rpc\(/);
      expect(src, f).not.toMatch(/\.from\(['"]businesses['"]/);
    }
  });

  it('no DB / migration / edge-function changes referenced from the page', () => {
    const src = read(PAGE);
    expect(src).not.toMatch(/supabase\/migrations/);
    expect(src).not.toMatch(/supabase\/functions/);
  });

  it('create / edit / publish wiring is preserved on the page', () => {
    const src = read(PAGE);
    expect(src).toMatch(/adminCreateBusinessWithOwner/);
    expect(src).toMatch(/updateBusinessById/);
    expect(src).toMatch(/<AdminBusinessesHeader\b/);
    expect(src).toMatch(/<BusinessBranchesPanel\b/);
  });

  it('keyboard cleanup is wired via the extracted hook (no inline listener)', () => {
    const src = read(PAGE);
    expect(src).toMatch(/useAdminBusinessesKeyboard\(/);
    expect(src).not.toMatch(/window\.addEventListener\(['"]keydown['"]/);
  });
});