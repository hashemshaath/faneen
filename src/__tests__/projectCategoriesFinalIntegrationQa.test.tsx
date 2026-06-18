import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PROJECT CATEGORIES — FINAL INTEGRATION QA
 *
 * Static guard test asserting the five pieces of the project-categories
 * feature stay wired. Pure file-content assertions — no React render,
 * no DB, no network.
 */

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const exists = (p: string) => existsSync(join(root, p));

const APP = 'src/App.tsx';
const NAV = 'src/modules/admin-shell/navigation/adminNavigation.ts';
const ADMIN_PAGE = 'src/pages/admin/AdminProjectCategories.tsx';
const DASHBOARD = 'src/pages/dashboard/DashboardProjects.tsx';
const PUBLIC = 'src/pages/Projects.tsx';
const PROFILE_TABS = 'src/components/business-profile/BusinessProfileTabs.tsx';
const PICKER = 'src/components/project/ProjectCategoryPicker.tsx';
const SORT_HOOK = 'src/hooks/useProjectSortPref.ts';
const E2E = 'e2e/project-category-tabs-responsive.spec.ts';

describe('PROJECT CATEGORIES FINAL INTEGRATION QA', () => {
  it('1. ProjectCategoryPicker is integrated into the dashboard project form', () => {
    expect(exists(PICKER)).toBe(true);
    const dash = read(DASHBOARD);
    expect(dash).toContain("from '@/components/project/ProjectCategoryPicker'");
    expect(dash).toMatch(/<ProjectCategoryPicker\b/);
  });

  it('2. useProjectSortPref is used in all three project surfaces', () => {
    expect(exists(SORT_HOOK)).toBe(true);
    for (const file of [DASHBOARD, PUBLIC, PROFILE_TABS]) {
      const src = read(file);
      expect(src, file).toContain('useProjectSortPref');
      expect(src, file).toContain('sortProjects');
    }
    expect(read(DASHBOARD)).toContain("useProjectSortPref('dashboard')");
    expect(read(PUBLIC)).toContain("useProjectSortPref('public')");
    expect(read(PROFILE_TABS)).toContain("useProjectSortPref('profile')");
  });

  it('3. /admin/project-categories is registered and admin-guarded', () => {
    expect(exists(ADMIN_PAGE)).toBe(true);
    const app = read(APP);
    expect(app).toMatch(/path="\/admin\/project-categories"/);
    expect(app).toMatch(/<ProtectedRoute requireAdmin>\s*<AdminProjectCategories\s*\/>/);
    expect(read(ADMIN_PAGE)).toContain('DashboardLayout');
  });

  it('4. Admin navigation exposes the project-categories entry', () => {
    expect(read(NAV)).toContain("route: '/admin/project-categories'");
  });

  it('5. Dynamic SEO is wired on the public Projects page', () => {
    const pub = read(PUBLIC);
    expect(pub).toContain('usePageMeta');
    expect(pub).toContain('useMultiJsonLd');
    expect(pub).toMatch(/selectedCategory/);
  });

  it('6. Playwright responsive spec exists with mobile + tablet viewports', () => {
    expect(exists(E2E)).toBe(true);
    const spec = read(E2E);
    expect(spec).toMatch(/mobile/);
    expect(spec).toMatch(/tablet/);
    expect(spec).toMatch(/\/projects/);
  });

  it('7. No DB/RLS/migration markers in the touched files', () => {
    const sources = [DASHBOARD, PUBLIC, PROFILE_TABS, PICKER, ADMIN_PAGE, SORT_HOOK]
      .map(read).join('\n');
    expect(sources).not.toMatch(/create\s+policy/i);
    expect(sources).not.toMatch(/alter\s+table/i);
    expect(sources).not.toMatch(/create\s+table/i);
  });

  it('8. No drag-and-drop was added to the admin categories page', () => {
    const page = read(ADMIN_PAGE);
    expect(page).not.toMatch(/@dnd-kit/);
    expect(page).not.toMatch(/react-beautiful-dnd/);
  });

  it('9. No hardcoded hex colors in the new surface files', () => {
    for (const f of [PICKER, ADMIN_PAGE, SORT_HOOK]) {
      const src = read(f);
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{3}\b/);
    }
  });

  it('10. No type/lint suppressions in the new surface files', () => {
    for (const f of [PICKER, ADMIN_PAGE, SORT_HOOK]) {
      const src = read(f);
      expect(src, f).not.toMatch(/@ts-ignore/);
      expect(src, f).not.toMatch(/@ts-expect-error/);
      expect(src, f).not.toMatch(/eslint-disable/);
      expect(src, f).not.toMatch(/\bas\s+any\b/);
      expect(src, f).not.toMatch(/:\s*any\b/);
    }
  });

  it('11. No skipped tests in the responsive spec', () => {
    const spec = read(E2E);
    expect(spec).not.toMatch(/test\.skip\b/);
    expect(spec).not.toMatch(/describe\.skip\b/);
  });
});
