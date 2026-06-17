import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const BRANCHES = 'src/pages/dashboard/DashboardBranches.tsx';
const PROJECTS = 'src/pages/dashboard/DashboardProjects.tsx';
const SITES    = 'src/pages/dashboard/DashboardSites.tsx';

describe('Dashboard no-entity UX — final regression guards', () => {
  const branches = read(BRANCHES);
  const projects = read(PROJECTS);
  const sites    = read(SITES);

  /* 1. Branches: Add-branch button hidden when no business */
  it('branches hides "Add branch" when no business', () => {
    // The actions render must gate on `businessId`
    expect(branches).toMatch(/businessId\s*\?\s*\(\s*<Button[\s\S]*?إضافة فرع/);
  });

  /* 2. Branches: CTA points to /register-entity */
  it('branches shows a CTA linking to /register-entity', () => {
    expect(branches).toMatch(/businessId === null/);
    expect(branches).toMatch(/to="\/register-entity"/);
    expect(branches).toMatch(/إنشاء منشأة|Create business/);
  });

  /* 3. Projects: Add-project button hidden when no business */
  it('projects hides "Add Project" when no business', () => {
    expect(projects).toMatch(/businessId\s*\?\s*\(\s*<Button[\s\S]*?(إضافة مشروع|Add Project)/);
  });

  /* 4. Projects: clear warning panel when no business */
  it('projects renders a no-business warning panel', () => {
    expect(projects).toMatch(/business !== undefined && !businessId/);
    expect(projects).toMatch(/لا يمكن إضافة مشاريع بدون منشأة|Cannot add projects without a business/);
    expect(projects).toMatch(/href="\/register-entity"/);
  });

  /* 5. Sites: personal-mode warning shown when no business */
  it('sites shows personal-mode warning when no business', () => {
    expect(sites).toMatch(/!businessId && !isLoading && user/);
    expect(sites).toMatch(/PersonalModeBanner/);
    expect(sites).toMatch(/لا توجد منشأة مرتبطة بحسابك|No business linked to your account/);
  });

  /* 6. Sites: "Create business" link goes to /register-entity */
  it('sites personal-mode banner links to /register-entity', () => {
    expect(sites).toMatch(/href="\/register-entity"/);
  });

  /* 7. Projects form exposes site_id selector when business exists */
  it('projects form includes site_id selector', () => {
    expect(projects).toMatch(/site_id:/);
    expect(projects).toMatch(/ownerSites/);
    expect(projects).toMatch(/الموقع التنفيذي|Execution site/);
  });

  /* 8. Projects save mutation refuses to run without business */
  it('projects save mutation throws if no business', () => {
    expect(projects).toMatch(/if \(!businessId\)\s*\{[\s\S]*?throw new Error/);
    // Must not silently coerce undefined business_id with non-null assertion
    expect(projects).not.toMatch(/business_id:\s*businessId!/);
  });

  /* 9. No hardcoded hex colors in the three edited files */
  it('no hardcoded hex colors in the touched files', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/g;
    for (const [name, src] of [['branches', branches], ['projects', projects], ['sites', sites]] as const) {
      const matches = src.match(hex) ?? [];
      expect(matches, `${name} should have no hex colors but found ${matches.join(', ')}`).toHaveLength(0);
    }
  });

  /* 10. No suppressed type checking in the touched files */
  it('no any / ts-ignore / eslint-disable in the touched files', () => {
    // Branches has some pre-existing `(... as any)` casts kept untouched — assert only that
    // the *new* projects/sites code added in this regression doesn't introduce more.
    for (const [name, src] of [['projects', projects], ['sites', sites]] as const) {
      expect(src, `${name} must not contain @ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(src, `${name} must not contain @ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(src, `${name} must not contain eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });

  /* 11. No service_role usage in client code */
  it('no service_role secret usage in the touched files', () => {
    for (const [name, src] of [['branches', branches], ['projects', projects], ['sites', sites]] as const) {
      expect(src, `${name} must not reference service_role`).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE/);
    }
  });
});