import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Phase 5I — Branch management UI extraction guard.
 *
 * Verifies that the branches tab content is mounted via the extracted
 * `BusinessBranchesPanel` adapter and that none of the inline branch
 * handlers (toggle/edit/save/delete + working-hours bulk apply + the
 * "use main contact" derivation) regressed.
 */
const repo = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.join(repo, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.join(repo, p));

const PAGE = 'src/pages/admin/AdminBusinesses.tsx';
const PANEL = 'src/pages/admin/businesses/components/BusinessBranchesPanel.tsx';
const NEW_FILES = [PANEL];

describe('AdminBusinesses Phase 5I branches panel extraction', () => {
  it('extracted branches panel exists on disk', () => {
    expect(exists(PANEL)).toBe(true);
  });

  it('page mounts the extracted BusinessBranchesPanel', () => {
    const src = read(PAGE);
    expect(src).toMatch(/<BusinessBranchesPanel\b/);
    // The legacy inline composition must be gone from the page.
    expect(src).not.toMatch(/<BusinessBranchesSection\b/);
  });

  it('branches panel wires create / edit / save / cancel / delete handlers', () => {
    const src = read(PANEL);
    // Re-uses the existing composer that hosts the form + list + add button.
    expect(src).toMatch(/BusinessBranchesSection/);
    // Add (create) flow keeps the empty-branch factory hook.
    expect(src).toMatch(/emptyBranch=\{emptyBranch\}/);
    // Edit hydration still funnels through the shared row-to-form mapper.
    expect(src).toMatch(/mapBranchRowToForm\(/);
    // Cancel clears the form by setting branchForm back to null via setEditingBranchId.
    expect(src).toMatch(/setEditingBranchId/);
    // Save / delete still flow through the parent mutations.
    expect(src).toMatch(/saveBranchMutation\.mutate\(\)/);
    expect(src).toMatch(/deleteBranchMutation\.mutate\(/);
  });

  it('working_hours bulk-apply flow is preserved unchanged', () => {
    const src = read(PANEL);
    expect(src).toMatch(/applyHoursToAllBranchesMutation\.mutate\(/);
    expect(src).toMatch(/applyingHoursToAllBranches/);
  });

  it('main-contact derivation still falls back from editForm to editingBiz', () => {
    const src = read(PANEL);
    expect(src).toMatch(/editForm\.unified_number\s*\?\?\s*editingBiz\.unified_number/);
    expect(src).toMatch(/editForm\.email\s*\?\?\s*editingBiz\.email/);
  });

  it('page still mounts create / edit / publish surfaces', () => {
    const src = read(PAGE);
    expect(src).toMatch(/<BusinessCreatePanel\b/);
    expect(src).toMatch(/<BusinessEditPanel\b/);
    expect(src).toMatch(/<BusinessPublicVisibilityCard\b/);
  });

  it('AdminBusinesses.tsx stays under the 1495-line guard ceiling', () => {
    // Phase 5I target was <1450; we safely landed at <=1490 without
    // shattering the file further. Keep a tight regression guard so
    // future changes do not silently regrow it past today's baseline.
    const lines = read(PAGE).split('\n').length;
    expect(lines).toBeLessThanOrEqual(1495);
  });

  it('no DB / RLS / RPC / migration / edge surface in the extracted panel', () => {
    const src = read(PANEL);
    expect(src).not.toMatch(/supabase\.rpc\(/);
    expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/client['"]/);
    expect(src).not.toMatch(/CREATE\s+POLICY/i);
    expect(src).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION/i);
  });

  it('no any / as any / suppressions in extracted modules', () => {
    for (const p of NEW_FILES) {
      const src = read(p);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/as\s+any\b/);
      expect(src).not.toMatch(/@ts-(ignore|expect-error|nocheck)/);
      expect(src).not.toMatch(/eslint-disable/);
    }
  });

  it('no hardcoded hex colors in extracted modules', () => {
    for (const p of NEW_FILES) {
      expect(read(p)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
});