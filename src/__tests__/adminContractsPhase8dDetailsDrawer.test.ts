/**
 * Phase 8D — Admin Contracts details drawer + timeline (read-only) guard.
 *
 * Verifies the new drawer/timeline primitives exist, are pure UI, contain
 * no edit/approve/PDF behavior, and that `AdminContracts.tsx` adopts the
 * drawer without leaking Supabase, mutations, or PDF coupling into the
 * new files.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SHARED_DIR = path.resolve(__dirname, '../components/admin/contracts/shared');
const PAGE_FILE = path.resolve(__dirname, '../pages/admin/AdminContracts.tsx');
const APP_TSX = path.resolve(__dirname, '../App.tsx');
const LIB_DIR = path.resolve(__dirname, '../lib');

const NEW_FILES = [
  'ContractDetailsDrawer.tsx',
  'ContractTimelineCard.tsx',
  'buildContractDetailsDrawerProps.ts',
];

function read(p: string): string {
  return fs.readFileSync(p, 'utf8');
}

describe('Phase 8D — admin contracts details drawer + timeline', () => {
  it('new files exist on disk and are barreled', () => {
    for (const f of NEW_FILES) {
      expect(fs.existsSync(path.join(SHARED_DIR, f))).toBe(true);
    }
    const barrel = read(path.join(SHARED_DIR, 'index.ts'));
    expect(barrel).toMatch(/\bContractDetailsDrawer\b/);
    expect(barrel).toMatch(/\bContractTimelineCard\b/);
    expect(barrel).toMatch(/\bbuildContractDetailsDrawerProps\b/);
  });

  it('AdminContracts.tsx adopts the drawer (no modal popup pattern)', () => {
    const page = read(PAGE_FILE);
    expect(page.includes('ContractDetailsDrawer')).toBe(true);
    expect(page.includes('buildContractDetailsDrawerProps')).toBe(true);
    // Strict project rule: no Dialog/Sheet popups
    expect(/from\s+['"]@\/components\/ui\/dialog['"]/.test(page)).toBe(false);
    expect(/from\s+['"]@\/components\/ui\/sheet['"]/.test(page)).toBe(false);
  });

  it('drawer is read-only — no edit / approve / reject / PDF / mutation tokens', () => {
    const drawer = read(path.join(SHARED_DIR, 'ContractDetailsDrawer.tsx'));
    const forbidden = [
      'useMutation',
      'approve',
      'reject',
      'signature',
      'pdf',
      'PDF',
      'generatePdf',
      'editContract',
      'updateContract',
      'deleteContract',
    ];
    for (const t of forbidden) {
      expect(drawer.includes(t), `drawer must not contain ${t}`).toBe(false);
    }
  });

  it('new files never import Supabase or contract execution services', () => {
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
    for (const f of NEW_FILES) {
      const src = read(path.join(SHARED_DIR, f));
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} must not import ${needle}`).toBe(false);
      }
    }
  });

  it('new files contain no queries or mutations', () => {
    const forbidden = ['useQuery(', 'useMutation(', '.from(', 'supabase'];
    for (const f of NEW_FILES) {
      const src = read(path.join(SHARED_DIR, f));
      for (const t of forbidden) {
        expect(src.includes(t), `${f} must not contain ${t}`).toBe(false);
      }
    }
  });

  it('new files have no hardcoded hex colors', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of NEW_FILES) {
      expect(hex.test(read(path.join(SHARED_DIR, f))), `${f} has hex`).toBe(false);
    }
  });

  it('new files have no any / ts-ignore / eslint-disable suppressions', () => {
    for (const f of NEW_FILES) {
      const src = read(path.join(SHARED_DIR, f));
      expect(/\bas\s+any\b/.test(src), `${f} uses 'as any'`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} uses ': any'`).toBe(false);
      expect(src.includes('@ts-ignore')).toBe(false);
      expect(src.includes('@ts-expect-error')).toBe(false);
      expect(src.includes('eslint-disable')).toBe(false);
    }
  });

  it('adapter is a pure synchronous function (no async / await / side effects)', () => {
    const adapter = read(path.join(SHARED_DIR, 'buildContractDetailsDrawerProps.ts'));
    expect(adapter.includes('export function buildContractDetailsDrawerProps')).toBe(true);
    expect(/\basync\b/.test(adapter)).toBe(false);
    expect(/\bawait\b/.test(adapter)).toBe(false);
    expect(adapter.includes('console.')).toBe(false);
  });

  it('legacy redirects in App.tsx remain intact', () => {
    const app = read(APP_TSX);
    expect(app.includes('<Navigate')).toBe(true);
  });

  it('contract pdf / hash / qr / signature libs remain on disk', () => {
    const survivors = fs
      .readdirSync(LIB_DIR)
      .filter((f) => /^contract-(pdf|hash|qr|signature)/.test(f));
    expect(survivors.length).toBeGreaterThan(0);
  });

  it('AdminContracts.tsx still owns the query (no relocation)', () => {
    const page = read(PAGE_FILE);
    expect(page.includes('useQuery')).toBe(true);
    expect(page.includes("from('contracts')")).toBe(true);
    // No mutations introduced by 8D
    expect(page.includes('useMutation')).toBe(false);
  });
});