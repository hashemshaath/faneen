import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ADMIN-REDESIGN PHASE 5B — Structural extraction guard.
 *
 * Verifies the AdminBusinesses page now composes its chrome from the
 * Phase 5B presentational primitives, that no banned references were
 * reintroduced, and that the new primitives stay presentation-only
 * (no Supabase, no sensitive columns, no hex colors).
 */
const repo = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');

const NEW_COMPONENTS = [
  'src/components/admin/businesses/AdminBusinessesPageShell.tsx',
  'src/components/admin/businesses/BusinessHeaderActions.tsx',
  'src/components/admin/businesses/BusinessFiltersBar.tsx',
  'src/components/admin/businesses/BusinessTableSection.tsx',
  'src/components/admin/businesses/BusinessPaginationFooter.tsx',
  'src/components/admin/businesses/BusinessVerifyConfirmDialog.tsx',
];

const SENSITIVE_COLS = [
  'cr_scan_raw', 'cr_scan_data', 'cr_document_url',
  'national_id', 'approval_notes', 'cr_owner_name',
];

describe('AdminBusinesses Phase 5B structural extraction', () => {
  it('all Phase 5B components exist on disk', () => {
    for (const p of NEW_COMPONENTS) {
      expect(fs.existsSync(path.join(repo, p)), `missing ${p}`).toBe(true);
    }
  });

  it('AdminBusinesses composes the new shell + sections', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).toMatch(/<AdminBusinessesPageShell\b/);
    expect(src).toMatch(/<BusinessHeaderActions\b/);
    expect(src).toMatch(/<BusinessFiltersBar\b/);
    expect(src).toMatch(/<BusinessTableSection\b/);
    expect(src).toMatch(/<BusinessPaginationFooter\b/);
    expect(src).toMatch(/<BusinessVerifyConfirmDialog\b/);
    // PageShell wrapper must replace direct DashboardLayout usage on this page.
    expect(src).not.toMatch(/<DashboardLayout\b/);
  });

  it('AdminBusinesses no longer inlines the verify AlertDialog', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).not.toMatch(/<AlertDialog\b/);
  });

  it('AdminBusinesses keeps SELECT * out of businesses reads', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).not.toMatch(/\.from\(['"]businesses['"]\)\s*\.\s*select\(\s*['"]\*['"]/);
    expect(src).not.toMatch(/\.from\(['"]businesses['"]\)\s*\.\s*select\(\s*\)/);
  });

  it('AdminBusinesses does not read sensitive columns through a select(...)', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    for (const col of SENSITIVE_COLS) {
      const selectRegex = new RegExp(`\\.select\\([^)]*\\b${col}\\b[^)]*\\)`);
      expect(selectRegex.test(src), `sensitive col ${col} in a .select(...)`).toBe(false);
    }
  });

  it('new Phase 5B components are presentation-only (no supabase, no sensitive cols, no hex)', () => {
    for (const p of NEW_COMPONENTS) {
      const src = read(p);
      expect(src, `${p} imports supabase`)
        .not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
      // Strip comments before sensitive-column scan.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      for (const col of SENSITIVE_COLS) {
        expect(code.includes(col), `${p} references sensitive column ${col}`).toBe(false);
      }
      // No hex literals (tokens only).
      expect(src.match(/#[0-9a-fA-F]{6}\b/), `${p} contains hex color`).toBeNull();
    }
  });

  it('AdminBusinesses.tsx size has materially decreased after Phase 5B', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    const lines = src.split('\n').length;
    // Pre-Phase-5B: 2314 lines. Keep at most 2230 to lock in the win.
    expect(lines).toBeLessThan(2230);
  });
});