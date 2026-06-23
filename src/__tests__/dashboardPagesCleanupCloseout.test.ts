import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  getVisibleDashboardNavGroups,
  UNIFIED_GROUP_LABELS,
  UNIFIED_ITEM_LABELS,
} from '@/modules/dashboard/navigation';

/**
 * DASHBOARD PAGES CLEANUP — closeout audit.
 *
 * Locks the invariants we just tightened so future edits cannot
 * regress visibility, accessibility, or type safety in the dashboard
 * navigation surface. Pure static + pure-function checks; no DOM
 * mounting and no DB.
 */

const ROOT = resolve(__dirname, '..', '..');
const NAV_DIR = resolve(ROOT, 'src/modules/dashboard/navigation');
const SIDEBAR = resolve(ROOT, 'src/components/dashboard/DashboardSidebar.tsx');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const navSources = walk(NAV_DIR).map((p) => ({ p, src: readFileSync(p, 'utf8') }));
const sidebarSrc = readFileSync(SIDEBAR, 'utf8');

describe('Dashboard navigation — type safety', () => {
  it('no `any` or `as any` in nav modules or sidebar', () => {
    const offenders = [
      ...navSources,
      { p: SIDEBAR, src: sidebarSrc },
    ].filter(({ src }) => /\bas\s+any\b/.test(src) || /:\s*any\b/.test(src));
    expect(offenders.map((o) => o.p)).toEqual([]);
  });

  it('no ts-ignore / eslint-disable in nav modules', () => {
    for (const { p, src } of navSources) {
      expect(src, p).not.toMatch(/@ts-ignore/);
      expect(src, p).not.toMatch(/eslint-disable/);
    }
  });

  it('no hardcoded hex colors in nav modules or sidebar', () => {
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const { p, src } of navSources) {
      expect(src, `hex in ${p}`).not.toMatch(hex);
    }
    // Sidebar must rely on design tokens only.
    expect(sidebarSrc, 'hex in DashboardSidebar.tsx').not.toMatch(hex);
  });
});

describe('Dashboard navigation — accessibility wiring', () => {
  it('sidebar uses aria-current for active links', () => {
    expect(sidebarSrc).toMatch(/aria-current=\{isActive \? 'page' : undefined\}/);
  });

  it('sidebar pin button exposes aria-label + aria-pressed', () => {
    expect(sidebarSrc).toMatch(/aria-pressed=\{pinned\}/);
    expect(sidebarSrc).toMatch(/aria-label=\{[\s\S]*?pinned[\s\S]*?\}/);
  });

  it('sidebar group toggle exposes aria-expanded + aria-controls', () => {
    expect(sidebarSrc).toMatch(/aria-expanded=\{isOpen\}/);
    expect(sidebarSrc).toMatch(/aria-controls=\{`sidebar-group-\$\{groupKey\}`\}/);
  });

  it('footer icon-only buttons all carry aria-label', () => {
    // Home / language toggle / logout — three aria-labels in the footer block.
    const footer = sidebarSrc.slice(sidebarSrc.indexOf('SidebarFooter'));
    const ariaLabels = footer.match(/aria-label=/g) ?? [];
    expect(ariaLabels.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Dashboard navigation — performance hygiene', () => {
  it('sidebar memoises base nav groups via useMemo', () => {
    expect(sidebarSrc).toMatch(/React\.useMemo\(\s*\n?\s*\(\)\s*=>\s*getVisibleDashboardNavGroups/);
  });

  it('sidebar memoises closeMobile + handleLogout via useCallback', () => {
    expect(sidebarSrc).toMatch(/const closeMobile = React\.useCallback/);
    expect(sidebarSrc).toMatch(/const handleLogout = React\.useCallback/);
  });

  it('sidebar derives audience exactly once', () => {
    const matches = sidebarSrc.match(/const audience:/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

describe('Dashboard navigation — visibility invariants (locked)', () => {
  it('individual without business sees «أعمال» but not «الفروع»', () => {
    const groups = getVisibleDashboardNavGroups({
      audience: 'user', hasBusiness: false, isSuperAdmin: false,
    });
    const groupEns = groups.map((g) => g.groupLabel.en);
    const itemEns = groups.flatMap((g) => g.items.map((it) => it.label.en));
    expect(groupEns).toContain(UNIFIED_GROUP_LABELS.business.en);
    expect(itemEns).toContain(UNIFIED_ITEM_LABELS.sites.en);
    // IA decision: personal client does NOT see «مشاريعي» — only
    // business owners / providers do. Projects belongs to the
    // business entity surface.
    expect(itemEns).not.toContain(UNIFIED_ITEM_LABELS.projects.en);
    expect(itemEns).not.toContain(UNIFIED_ITEM_LABELS.branches.en);
    expect(groupEns).not.toContain(UNIFIED_GROUP_LABELS.businessEntity.en);
  });

  it('owner sees «الفروع» and «أعمال المنشأة»', () => {
    const groups = getVisibleDashboardNavGroups({
      audience: 'user', hasBusiness: true, isSuperAdmin: false,
    });
    const itemEns = groups.flatMap((g) => g.items.map((it) => it.label.en));
    const groupEns = groups.map((g) => g.groupLabel.en);
    expect(itemEns).toContain(UNIFIED_ITEM_LABELS.branches.en);
    expect(groupEns).toContain(UNIFIED_GROUP_LABELS.businessEntity.en);
  });

  it('desktop + mobile share the same source (one renderer, one helper)', () => {
    // The sidebar shell is rendered for both viewports via shadcn
    // `<Sidebar />`; it must consume `getVisibleDashboardNavGroups`
    // exactly once so desktop and mobile cannot diverge.
    const calls = sidebarSrc.match(/getVisibleDashboardNavGroups\s*\(/g) ?? [];
    expect(calls.length).toBe(1);
  });

  it('pure visibility helper is deterministic across calls', () => {
    const a = getVisibleDashboardNavGroups({ audience: 'user', hasBusiness: false, isSuperAdmin: false });
    const b = getVisibleDashboardNavGroups({ audience: 'user', hasBusiness: false, isSuperAdmin: false });
    expect(a.map((g) => g.key)).toEqual(b.map((g) => g.key));
  });
});