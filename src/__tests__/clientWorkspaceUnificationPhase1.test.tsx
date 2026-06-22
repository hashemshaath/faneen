/**
 * CLIENT WORKSPACE UNIFICATION — Phase 1 guards.
 *
 * Static-source guards (no rendering) that lock in:
 *  - the two new routes are wired and protected
 *  - the sidebar exposes «مشاريعي ومواقعي»
 *  - the service unifies projects + standalone sites and exposes
 *    the expected types/functions
 *  - the create-contract CTA is disabled and contracts are read via
 *    `execution_site_id`
 *  - P1 introduces zero DB/RPC/migration/edge changes
 *  - no `any` / `as any` / `ts-ignore` / hex-literal regressions in
 *    the newly added files
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(__dirname, '..', '..');
const r = (p: string) => resolve(root, p);

const APP = readFileSync(r('src/App.tsx'), 'utf8');
const NAV = readFileSync(
  r('src/modules/dashboard/navigation/dashboardNavigation.config.ts'),
  'utf8',
);
const SERVICE = readFileSync(r('src/services/clientWorkspaceService.ts'), 'utf8');
const LIST_PAGE = readFileSync(r('src/pages/dashboard/DashboardWorkspaces.tsx'), 'utf8');
const DETAIL_PAGE = readFileSync(
  r('src/pages/dashboard/DashboardWorkspaceDetail.tsx'),
  'utf8',
);
const CONTRACTS_TAB = readFileSync(
  r('src/components/workspace/WorkspaceContractsTab.tsx'),
  'utf8',
);
const FILES_TAB = readFileSync(
  r('src/components/workspace/WorkspaceFilesTab.tsx'),
  'utf8',
);
const OVERVIEW_TAB = readFileSync(
  r('src/components/workspace/WorkspaceOverviewTab.tsx'),
  'utf8',
);
const COMING_SOON_TAB = readFileSync(
  r('src/components/workspace/WorkspaceComingSoonTab.tsx'),
  'utf8',
);

const newFiles = {
  SERVICE,
  LIST_PAGE,
  DETAIL_PAGE,
  CONTRACTS_TAB,
  FILES_TAB,
  OVERVIEW_TAB,
  COMING_SOON_TAB,
};

describe('CLIENT WORKSPACE UNIFICATION P1 — routes', () => {
  it('exposes /dashboard/workspaces inside ProtectedRoute', () => {
    expect(APP).toMatch(
      /path="\/dashboard\/workspaces"\s+element=\{<ProtectedRoute><DashboardWorkspaces \/><\/ProtectedRoute>\}/,
    );
  });
  it('exposes /dashboard/workspaces/:kind/:id inside ProtectedRoute', () => {
    expect(APP).toMatch(
      /path="\/dashboard\/workspaces\/:kind\/:id"\s+element=\{<ProtectedRoute><DashboardWorkspaceDetail \/><\/ProtectedRoute>\}/,
    );
  });
  it('lazy-imports both new pages', () => {
    expect(APP).toMatch(/DashboardWorkspaces.*import\("\.\/pages\/dashboard\/DashboardWorkspaces"\)/);
    expect(APP).toMatch(/DashboardWorkspaceDetail.*import\("\.\/pages\/dashboard\/DashboardWorkspaceDetail"\)/);
  });
});

describe('CLIENT WORKSPACE UNIFICATION P1 — sidebar', () => {
  it('user nav exposes «مشاريعي ومواقعي» pointing at /dashboard/workspaces', () => {
    expect(NAV).toMatch(/مشاريعي ومواقعي/);
    expect(NAV).toMatch(/url:\s*'\/dashboard\/workspaces'/);
  });
});

describe('CLIENT WORKSPACE UNIFICATION P1 — service', () => {
  it('exports the ClientWorkspace primitives and read-only helpers', () => {
    expect(SERVICE).toMatch(/export\s+type\s+ClientWorkspaceKind\s*=\s*'project'\s*\|\s*'site'/);
    expect(SERVICE).toMatch(/export\s+interface\s+ClientWorkspace\b/);
    expect(SERVICE).toMatch(/export\s+async\s+function\s+listClientWorkspaces/);
    expect(SERVICE).toMatch(/export\s+async\s+function\s+getClientWorkspace/);
    expect(SERVICE).toMatch(/export\s+async\s+function\s+listWorkspaceContracts/);
    expect(SERVICE).toMatch(/export\s+async\s+function\s+listWorkspaceProjectImages/);
  });

  it('unifies projects + standalone client_sites', () => {
    expect(SERVICE).toMatch(/from\('projects'\)/);
    expect(SERVICE).toMatch(/from\('client_sites'\)/);
    // standalone sites are computed by excluding sites already attached
    // to a project via project.site_id.
    expect(SERVICE).toMatch(/usedSiteIds/);
  });

  it('reads contracts strictly via execution_site_id', () => {
    expect(SERVICE).toMatch(/from\('contracts'\)/);
    expect(SERVICE).toMatch(/\.eq\('execution_site_id',\s*siteId\)/);
  });

  it('never calls create-contract RPCs in P1', () => {
    // Allow doc comments to reference RPC names, but forbid actual
    // `.rpc('create_contract_from_*')` invocations.
    expect(SERVICE).not.toMatch(/\.rpc\(\s*['"]create_contract_from_/);
    expect(SERVICE).not.toMatch(/\.rpc\(/);
  });
});

describe('CLIENT WORKSPACE UNIFICATION P1 — UI behavior', () => {
  it('contracts tab renders a DISABLED create-contract CTA with helper text', () => {
    expect(CONTRACTS_TAB).toMatch(/disabled/);
    expect(CONTRACTS_TAB).toMatch(/إنشاء عقد من هذا المشروع/);
    expect(CONTRACTS_TAB).toMatch(/قيد التفعيل/);
    expect(CONTRACTS_TAB).toMatch(/workspace-create-contract-disabled/);
  });

  it('contracts tab does NOT import or invoke create_contract_from_template', () => {
    expect(CONTRACTS_TAB).not.toMatch(/create_contract_from_template/);
    expect(CONTRACTS_TAB).not.toMatch(/\.rpc\(/);
  });

  it('files tab is read-only (no upload UI)', () => {
    expect(FILES_TAB).not.toMatch(/ImageUpload|MultiImageUpload|<input[^>]*type="file"/);
    expect(FILES_TAB).toMatch(/listWorkspaceProjectImages/);
  });

  it('coming-soon tabs do not introduce forms or mutations', () => {
    expect(COMING_SOON_TAB).not.toMatch(/<form|useMutation|\.rpc\(|\.insert\(|\.update\(|\.delete\(/);
    expect(DETAIL_PAGE).toMatch(/titleAr="الرخص"/);
    expect(DETAIL_PAGE).toMatch(/titleAr="المخالفات"/);
    expect(DETAIL_PAGE).toMatch(/titleAr="البلاغات"/);
  });

  it('list page does not embed a ClientPicker (client is implicit)', () => {
    expect(LIST_PAGE).not.toMatch(/ClientPicker/);
    expect(DETAIL_PAGE).not.toMatch(/ClientPicker/);
  });
});

describe('CLIENT WORKSPACE UNIFICATION P1 — purity & safety', () => {
  for (const [name, src] of Object.entries(newFiles)) {
    it(`${name} has no \`any\` / \`as any\` / \`ts-ignore\` / \`eslint-disable\``, () => {
      // word-boundary match avoids hitting words like "many"
      expect(src).not.toMatch(/\bas\s+any\b/);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/eslint-disable/);
    });

    it(`${name} has no hardcoded hex color literal`, () => {
      expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });

    it(`${name} never references service_role`, () => {
      expect(src).not.toMatch(/service_role/);
    });
  }
});

describe('CLIENT WORKSPACE UNIFICATION P1 — DB/RPC/edge isolation', () => {
  it('no migration files were added in this phase', () => {
    // Heuristic: search supabase/migrations for the phase keyword.
    const migDir = r('supabase/migrations');
    if (!existsSync(migDir)) return;
    const offenders = readdirSync(migDir).filter((f) =>
      /workspace_unification|client_workspace/i.test(f),
    );
    expect(offenders).toEqual([]);
  });

  it('no edge function was added for client workspaces', () => {
    const fnDir = r('supabase/functions');
    if (!existsSync(fnDir)) return;
    const offenders = readdirSync(fnDir).filter((f) =>
      /client[-_]?workspace/i.test(f),
    );
    expect(offenders).toEqual([]);
  });
});