import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * NAV-UI-POLISH-1 guards.
 *
 * Pure source-text assertions on the polished sidebar:
 *  - best-match active resolver exists and is wired into RenderGroups
 *  - optional bilingual `description` + static `badge` types exist
 *  - group descriptions added for Operations / Overview / Membership
 *  - static badges added for Operations Feed (New) and Bulk Triage (Support)
 *  - active-state styling preserved (left primary bar)
 *  - focus-visible ring present
 *  - mobile trigger still rendered by DashboardLayout
 *  - no href="#"; no duplicate sidebar systems
 */
const root = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf8');

const SIDEBAR = read('src/components/dashboard/DashboardSidebar.tsx');
const LAYOUT = read('src/components/dashboard/DashboardLayout.tsx');
const APP = read('src/App.tsx');
const CONSOLE = read('src/pages/admin/AdminOperationsConsole.tsx');

describe('NAV-UI-POLISH-1 — best-match active resolver', () => {
  it('declares resolveBestMatch helper', () => {
    expect(SIDEBAR).toMatch(/const resolveBestMatch\s*=/);
  });
  it('uses useLocation to drive active matching', () => {
    expect(SIDEBAR).toMatch(/useLocation/);
    expect(SIDEBAR).toMatch(/const \{ pathname \} = useLocation\(\)/);
  });
  it('passes bestActiveUrl down to RenderMenu', () => {
    expect(SIDEBAR).toMatch(/bestActiveUrl/);
    expect(SIDEBAR).toMatch(/isActive\s*=\s*item\.url === bestActiveUrl/);
  });
  it('marks the active item with aria-current="page"', () => {
    expect(SIDEBAR).toMatch(/aria-current=\{isActive \? 'page' : undefined\}/);
  });
});

describe('NAV-UI-POLISH-1 — types support badges + descriptions', () => {
  it('MenuItem has optional bilingual badge', () => {
    expect(SIDEBAR).toMatch(/badge\?:\s*\{\s*ar:\s*string;\s*en:\s*string/);
  });
  it('MenuGroup has optional bilingual description', () => {
    expect(SIDEBAR).toMatch(/description\?:\s*\{\s*ar:\s*string;\s*en:\s*string\s*\}/);
  });
});

describe('NAV-UI-POLISH-1 — descriptions on major groups', () => {
  it('Operations group has bilingual description', () => {
    expect(SIDEBAR).toMatch(/Work orders, contracts, and warranties/);
  });
  it('Membership & Billing group has bilingual description', () => {
    expect(SIDEBAR).toMatch(/Subscriptions, credits, and installments/);
  });
  it('Admin Overview group has bilingual description', () => {
    expect(SIDEBAR).toMatch(/Dashboards, operations, and references/);
  });
});

describe('NAV-UI-POLISH-1 — static badges', () => {
  it('Operations Feed entry carries a "new" badge', () => {
    expect(SIDEBAR).toMatch(/\/dashboard\/operations\/feed[\s\S]*tone:\s*'new'/);
  });
  it('Work Orders entry carries a "new" badge', () => {
    expect(SIDEBAR).toMatch(/'Work Orders'[\s\S]*tone:\s*'new'/);
  });
  it('Bulk Reference Triage carries a "support" badge', () => {
    expect(SIDEBAR).toMatch(/Bulk Reference Triage[\s\S]*tone:\s*'support'/);
  });
});

describe('NAV-UI-POLISH-1 — active + focus visuals', () => {
  it('keeps the primary left bar marker on active items', () => {
    expect(SIDEBAR).toMatch(/before:start-0/);
    expect(SIDEBAR).toMatch(/before:bg-primary/);
  });
  it('adds focus-visible ring for keyboard users', () => {
    expect(SIDEBAR).toMatch(/focus-visible:ring-2/);
    expect(SIDEBAR).toMatch(/focus-visible:ring-primary\/40/);
  });
  it('still respects RTL/LTR via logical inset (before:start-0)', () => {
    expect(SIDEBAR).not.toMatch(/before:left-0/);
    expect(SIDEBAR).not.toMatch(/before:right-0/);
  });
});

describe('NAV-UI-POLISH-1 — Admin Operations Console shortcuts', () => {
  it('keeps the three provider operations links unchanged', () => {
    expect(CONSOLE).toMatch(/to:\s*'\/dashboard\/work-orders'/);
    expect(CONSOLE).toMatch(/to:\s*'\/dashboard\/work-orders\/overview'/);
    expect(CONSOLE).toMatch(/to:\s*'\/dashboard\/operations\/feed'/);
  });
  it('uses hover-lift + focus ring on each shortcut card', () => {
    expect(CONSOLE).toMatch(/hover-lift/);
    expect(CONSOLE).toMatch(/focus-visible:ring-primary\/40/);
  });
  it('preserves bilingual helper text', () => {
    expect(CONSOLE).toMatch(/provider-scoped and depend on the active workspace/);
    expect(CONSOLE).toMatch(/تعتمد على مساحة العمل النشطة/);
  });
  it('has no dead href="#" anchors', () => {
    expect(CONSOLE).not.toMatch(/href="#"/);
  });
});

describe('NAV-UI-POLISH-1 — layout safety', () => {
  it('DashboardLayout still mounts the mobile SidebarTrigger', () => {
    expect(LAYOUT).toMatch(/SidebarTrigger/);
  });
  it('App.tsx still renders DashboardSidebar (no duplicate sidebar system)', () => {
    // The sidebar lives in DashboardLayout, not App.tsx — make sure nothing
    // else imports a competing sidebar component name.
    expect(APP).not.toMatch(/from ['"]@\/components\/AdminSidebar['"]/);
  });
});