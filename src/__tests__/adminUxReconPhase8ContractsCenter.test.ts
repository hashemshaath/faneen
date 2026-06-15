/**
 * ADMIN UX RECONSOLIDATION PHASE 8 — Contracts Center guard.
 *
 * Locks in the structural contract of the unified admin contracts
 * surface: tabs present, legacy routes preserved, and no executive
 * coupling in the center's new presentational pieces.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const HUB = path.join(ROOT, 'pages/admin/AdminContractsHub.tsx');
const CENTER_DIR = path.join(ROOT, 'components/admin/centers/contracts');
const APP_TSX = path.join(ROOT, 'App.tsx');

const CENTER_FILES = [
  'ContractsOverviewLanding.tsx',
  'ApprovalsLanding.tsx',
  'AuditLanding.tsx',
];

const read = (p: string) => fs.readFileSync(p, 'utf8');
const hub = () => read(HUB);
const app = () => read(APP_TSX);
const center = (f: string) => read(path.join(CENTER_DIR, f));

describe('Phase 8 — Admin Contracts Center', () => {
  it('1. /admin/contracts is wired to AdminContractsHub which uses TabbedShell', () => {
    expect(app()).toMatch(/path="\/admin\/contracts"\s+element=\{[^}]*AdminContractsHub/);
    expect(hub()).toMatch(/TabbedShell/);
  });

  it('2. Contracts Center declares all required tabs', () => {
    const src = hub();
    for (const key of ['overview', 'contracts', 'templates', 'approvals', 'exports', 'audit']) {
      expect(src, `missing tab key=${key}`).toMatch(new RegExp(`key:\\s*['"]${key}['"]`));
    }
  });

  it('3. Legacy contract routes still exist (or redirect into the hub)', () => {
    const src = app();
    expect(src).toMatch(/path="\/admin\/contracts"/);
    expect(src).toMatch(/path="\/admin\/contracts\/create"/);
    expect(src).toMatch(/path="\/admin\/contracts\/analytics"/);
    expect(src).toMatch(/path="\/admin\/contract-templates"/);
  });

  it('4. /admin/pdf-exports preserved as a safe redirect', () => {
    const src = app();
    expect(src).toMatch(/path="\/admin\/pdf-exports"[^>]*Navigate[^>]*to="\/admin\/contracts\?tab=exports"/);
  });

  it('5. No legacy contract route was deleted without a redirect', () => {
    const src = app();
    for (const r of ['/admin/contract-templates', '/admin/pdf-exports', '/admin/contracts/create', '/admin/contracts/analytics']) {
      expect(src.includes(`path="${r}"`), `route missing: ${r}`).toBe(true);
    }
  });

  it('6. Center landings never import Supabase', () => {
    for (const f of CENTER_FILES) {
      const src = center(f);
      expect(src.includes('@/integrations/supabase'), `${f} imports supabase`).toBe(false);
      expect(src.includes('supabase-js'), `${f} imports supabase-js`).toBe(false);
    }
  });

  it('7. Center landings contain no queries or mutations', () => {
    for (const f of CENTER_FILES) {
      const src = center(f);
      for (const t of ['useQuery(', 'useMutation(', 'useInfiniteQuery(', '.from(', '.rpc(']) {
        expect(src.includes(t), `${f} contains ${t}`).toBe(false);
      }
    }
  });

  it('8. Center landings do not import executive contract services', () => {
    const forbidden = [
      '@/modules/contracts/services',
      'adminCreateContractOnBehalf',
      'contract-pdf',
      'contract-hash',
      'contract-qr',
      'contract-signature',
      'businessService',
    ];
    for (const f of CENTER_FILES) {
      const src = center(f);
      for (const needle of forbidden) {
        expect(src.includes(needle), `${f} imports ${needle}`).toBe(false);
      }
    }
  });

  it('9. Hub is presentational — no DB/RLS/RPC/edge wiring inside', () => {
    const src = hub();
    expect(src.includes('@/integrations/supabase')).toBe(false);
    expect(src.includes('supabase/migrations')).toBe(false);
    expect(src.includes('.rpc(')).toBe(false);
    expect(src.includes('supabase/functions')).toBe(false);
  });

  it('10-12. Contract lifecycle / approvals / PDF / hash / QR / signature / public routes untouched by hub & landings', () => {
    const all = [hub(), ...CENTER_FILES.map((f) => center(f))];
    for (const src of all) {
      for (const needle of [
        'document_hash', 'contract-hash', 'contract-signature', 'contract-qr',
        'contract-pdf', 'pdf-lib', 'jspdf', 'qrcode',
      ]) {
        expect(src.includes(needle)).toBe(false);
      }
    }
  });

  it('13. No any/ts-ignore/ts-expect-error/eslint-disable in new files', () => {
    for (const f of CENTER_FILES) {
      const src = center(f);
      expect(/\bas\s+any\b/.test(src), `${f} as any`).toBe(false);
      expect(/:\s*any\b/.test(src), `${f} :any`).toBe(false);
      expect(src.includes('@ts-ignore'), `${f}`).toBe(false);
      expect(src.includes('@ts-expect-error'), `${f}`).toBe(false);
      expect(src.includes('eslint-disable'), `${f}`).toBe(false);
    }
  });

  it('14. No hardcoded hex colors in new files', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of CENTER_FILES) {
      expect(hex.test(center(f)), `${f} contains hex color`).toBe(false);
    }
  });
});