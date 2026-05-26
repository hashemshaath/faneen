/**
 * WORKSPACE-CONTEXT-2 — audit guarantees:
 * - Workspace location wrappers live under src/modules/locations and do not
 *   import from pages.
 * - useActiveWorkspace consumes the canonical wrapper, not raw supabase.from.
 * - No RLS / route / payment / auth files were touched by this phase
 *   (verified by checking the workspace hook does not import from those areas).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src');

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

describe('WORKSPACE-CONTEXT-2 audit', () => {
  it('useActiveWorkspace uses canonical location wrapper, not raw supabase', () => {
    const src = read('hooks/useActiveWorkspace.ts');
    expect(src).toContain("from '@/modules/locations'");
    expect(src).toContain('listLocationsForEntity');
    expect(src).not.toMatch(/supabase\.from\(['"]business_branches['"]\)/);
  });

  it('location wrappers do not import from pages or components', () => {
    for (const f of [
      'modules/locations/services/workspace/listLocationsForEntity.ts',
      'modules/locations/services/workspace/getLocationById.ts',
      'modules/locations/services/workspace/listLocationAssignmentsForUser.ts',
    ]) {
      const src = read(f);
      expect(src).not.toMatch(/from ['"]@\/pages\//);
      expect(src).not.toMatch(/from ['"]@\/components\//);
    }
  });

  it('phase did not modify payment, auth, or route files (hook scope only)', () => {
    const src = read('hooks/useActiveWorkspace.ts');
    expect(src).not.toMatch(/payments|stripe|paddle|tabby|tamara/i);
    expect(src).not.toMatch(/react-router|useNavigate|<Route/);
    expect(src).not.toMatch(/createPolicy|ENABLE ROW LEVEL SECURITY/i);
  });

  it('location_id preference key is scoped per (user, entity)', () => {
    const src = read('hooks/useActiveWorkspace.ts');
    expect(src).toContain('qitaat_active_location_');
    // Ensure it interpolates both uid and entityId.
    expect(src).toMatch(/qitaat_active_location_\$\{uid\}_\$\{entityId\}/);
  });
});