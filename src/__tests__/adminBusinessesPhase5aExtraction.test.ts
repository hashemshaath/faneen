import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ADMIN-REDESIGN PHASE 5A — AdminBusinesses extraction guard.
 *
 * Verifies the modular rebuild of the AdminBusinesses surface:
 *   - The new presentational primitives exist on disk.
 *   - The page wires the rich stats strip + read-only details drawer.
 *   - No `SELECT *` was introduced on businesses inside the page.
 *   - No direct reads of sensitive columns (cr_scan_*, cr_document_url,
 *     national_id, approval_notes, cr_owner_name) were introduced in
 *     the page or in the new components.
 *   - The new components do not import the supabase client (presentation-
 *     only, no DB access).
 */
const repo = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');

const NEW_COMPONENTS = [
  'src/components/admin/businesses/BusinessStatusBadge.tsx',
  'src/components/admin/businesses/BusinessStatsStrip.tsx',
  'src/components/admin/businesses/BusinessRowActions.tsx',
  'src/components/admin/businesses/BusinessDetailsDrawer.tsx',
];

const SENSITIVE_COLS = [
  'cr_scan_raw',
  'cr_scan_data',
  'cr_document_url',
  'national_id',
  'approval_notes',
  'cr_owner_name',
];

describe('AdminBusinesses Phase 5A modular extraction', () => {
  it('new presentational components exist on disk', () => {
    for (const p of NEW_COMPONENTS) {
      expect(fs.existsSync(path.join(repo, p)), `missing ${p}`).toBe(true);
    }
  });

  it('AdminBusinesses imports and renders BusinessStatsStrip + BusinessDetailsDrawer', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    expect(src).toMatch(/from '@\/components\/admin\/businesses\/BusinessStatsStrip'/);
    expect(src).toMatch(/from '@\/components\/admin\/businesses\/BusinessDetailsDrawer'/);
    expect(src).toMatch(/<BusinessStatsStrip\b/);
    expect(src).toMatch(/<BusinessDetailsDrawer\b/);
  });

  it('AdminBusinesses does not introduce SELECT * on businesses', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    // Allow .select(BUSINESS_SAFE_COLUMNS_SELECT) and explicit column lists only.
    expect(src).not.toMatch(/\.from\(['"]businesses['"]\)\s*\.\s*select\(\s*['"]\*['"]/);
    expect(src).not.toMatch(/\.from\(['"]businesses['"]\)\s*\.\s*select\(\s*\)/);
  });

  it('AdminBusinesses does not read sensitive columns directly', () => {
    const src = read('src/pages/admin/AdminBusinesses.tsx');
    for (const col of SENSITIVE_COLS) {
      // Acceptable: appears in create-form schema (national_id is admin-input
      // for registry, written via insertBusiness, not read from list query).
      // Reject any `.select(...col...)` literal that includes a sensitive col.
      const selectRegex = new RegExp(`\\.select\\([^)]*\\b${col}\\b[^)]*\\)`);
      expect(selectRegex.test(src), `unexpected sensitive column "${col}" inside a .select(...)`).toBe(false);
    }
  });

  it('new components do not import supabase client (pure presentational)', () => {
    for (const p of NEW_COMPONENTS) {
      const src = read(p);
      expect(src, `${p} should not import supabase`).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
      // No sensitive-column reads inside the presentational primitives.
      for (const col of SENSITIVE_COLS) {
        expect(src.includes(col), `${p} should not reference sensitive column ${col}`).toBe(false);
      }
    }
  });

  it('BusinessStatsStrip exposes the new semantic categories', () => {
    const src = read('src/components/admin/businesses/BusinessStatsStrip.tsx');
    // Categories beyond the legacy total/active/verified set.
    expect(src).toMatch(/Under Review/);
    expect(src).toMatch(/Drafts/);
    expect(src).toMatch(/Rejected/);
    expect(src).toMatch(/data-testid="business-stats-strip"/);
    // Semantic token classes only — no hex colors.
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it('BusinessStatusBadge derives status from approval_status + flags without sensitive reads', () => {
    const src = read('src/components/admin/businesses/BusinessStatusBadge.tsx');
    expect(src).toMatch(/approval_status/);
    expect(src).toMatch(/is_active/);
    expect(src).toMatch(/is_verified/);
    // Tone tokens come from AdminStatusBadge — no hex colors here.
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});