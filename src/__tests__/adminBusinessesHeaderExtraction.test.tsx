import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ADMIN BUSINESSES — PHASE 5J: Header + KPI action bar extraction guard.
 *
 * Verifies the AdminPageHeader + action cluster + saved-views menu were
 * extracted into a dedicated presentational component without changing
 * any behavior, mutations, public visibility, filters/list state,
 * branches/working hours, or DB/RLS/RPC concerns.
 */
const repo = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');

const HEADER = 'src/pages/admin/businesses/components/AdminBusinessesHeader.tsx';
const PAGE = 'src/pages/admin/AdminBusinesses.tsx';

describe('AdminBusinesses Phase 5J header + KPI action bar extraction', () => {
  it('AdminBusinessesHeader component exists on disk', () => {
    expect(fs.existsSync(path.join(repo, HEADER))).toBe(true);
  });

  it('AdminBusinesses renders the extracted header component', () => {
    const src = read(PAGE);
    expect(src).toMatch(/<AdminBusinessesHeader\b/);
    expect(src).toMatch(/from '\.\/businesses\/components\/AdminBusinessesHeader'/);
  });

  it('AdminBusinesses no longer inlines AdminPageHeader / SavedViewsMenu', () => {
    const src = read(PAGE);
    expect(src).not.toMatch(/<AdminPageHeader\b/);
    expect(src).not.toMatch(/<SavedViewsMenu\b/);
  });

  it('Header still wires the create / refresh / export handlers from the page', () => {
    const src = read(PAGE);
    expect(src).toMatch(/onRefresh=\{[^}]*refetchBusinesses\(\)/);
    expect(src).toMatch(/onExportCsv=\{[^}]*exportCSV\(filtered/);
    expect(src).toMatch(/onCreate=\{[^}]*setCreatingBiz\(true\)/);
    expect(src).toMatch(/savedViews=\{savedViews\}/);
    expect(src).toMatch(/onApplySavedView=\{applySavedView\}/);
  });

  it('Header component is presentation-only (no Supabase, no mutations, no sensitive cols)', () => {
    const src = read(HEADER);
    expect(src).not.toMatch(/from ['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/useMutation|useQuery/);
    for (const col of ['cr_scan_raw', 'cr_scan_data', 'cr_document_url', 'national_id', 'approval_notes', 'cr_owner_name']) {
      expect(src.includes(col), `${col} must not appear in header`).toBe(false);
    }
  });

  it('Header component has no any/as any, no hex colors, no suppressions', () => {
    const src = read(HEADER);
    expect(src).not.toMatch(/\bas\s+any\b/);
    expect(src).not.toMatch(/:\s*any\b/);
    expect(src).not.toMatch(/@ts-ignore|@ts-nocheck|eslint-disable/);
    expect(src).not.toMatch(/#[0-9a-fA-F]{6}\b/);
  });

  it('AdminBusinesses.tsx is under the 1450-line target after Phase 5J', () => {
    const lines = read(PAGE).split('\n').length;
    expect(lines).toBeLessThan(1450);
  });

  it('Create / edit / publish wiring and route are preserved', () => {
    const src = read(PAGE);
    expect(src).toMatch(/adminCreateBusinessWithOwner/);
    expect(src).toMatch(/updateBusinessById/);
    expect(src).toMatch(/createAdminPublishPayload|BusinessPublicVisibilityCard/);
  });

  it('Branches / working hours wiring is preserved (still via BusinessBranchesPanel)', () => {
    const src = read(PAGE);
    expect(src).toMatch(/<BusinessBranchesPanel\b/);
  });

  it('No DB/RLS/RPC/migrations/edge changes in header component', () => {
    const src = read(HEADER);
    expect(src).not.toMatch(/\.from\(['"]businesses['"]/);
    expect(src).not.toMatch(/\.rpc\(/);
  });
});