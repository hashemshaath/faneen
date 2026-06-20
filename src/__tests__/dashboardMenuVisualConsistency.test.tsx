import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PHASE B — visual-consistency guard for the dashboard sidebar.
 *
 * Asserts that section headings, menu items, active state, icon size,
 * and mobile rendering all flow from the single `DashboardSidebar`
 * render path (no parallel sidebar implementations have leaked in)
 * and use design tokens — not hardcoded colors.
 */

const root = resolve(__dirname, '..', '..');
const SIDEBAR = readFileSync(
  resolve(root, 'src/components/dashboard/DashboardSidebar.tsx'),
  'utf8',
);

describe('PHASE B — sidebar visual consistency', () => {
  it('renders section headings via a single SidebarGroupLabel template', () => {
    const matches = SIDEBAR.match(/<SidebarGroupLabel\b/g) || [];
    // Exactly one heading template — guards against drift / forks.
    expect(matches.length).toBe(1);
  });

  it('section heading uses the unified typography token (text-[10.5px])', () => {
    expect(SIDEBAR).toContain('text-[10.5px]');
    expect(SIDEBAR).toContain('uppercase tracking-[0.08em]');
  });

  it('renders menu items via a single RenderMenu component', () => {
    const matches = SIDEBAR.match(/<RenderMenu\b/g) || [];
    expect(matches.length).toBe(1);
  });

  it('menu item uses the unified height + radius + spacing tokens', () => {
    expect(SIDEBAR).toContain('h-11 min-h-[44px] rounded-xl px-3 gap-2.5');
  });

  it('active state uses the unified semantic gradient + ring', () => {
    expect(SIDEBAR).toContain('from-primary/15 to-primary/[0.04]');
    expect(SIDEBAR).toContain('ring-1 ring-primary/20');
  });

  it('hover state uses sidebar-accent tokens (no hardcoded color)', () => {
    expect(SIDEBAR).toContain('hover:bg-sidebar-accent');
  });

  it('icons in menu items use a single size token (h-4 w-4)', () => {
    // Menu item icons: `<item.icon className={ 'h-4 w-4 shrink-0 ...' }`
    expect(SIDEBAR).toMatch(/<item\.icon className=\{\s*\n?\s*'h-4 w-4 shrink-0/);
  });

  it('uses a single Sidebar root (no parallel sidebar)', () => {
    const roots = SIDEBAR.match(/<Sidebar\s+collapsible=/g) || [];
    expect(roots.length).toBe(1);
  });

  it('mobile menu shares the same config — closeMobile threaded through', () => {
    expect(SIDEBAR).toContain('setOpenMobile');
    expect(SIDEBAR).toContain('closeMobile');
    // RenderGroups must receive the same closeMobile handler.
    expect(SIDEBAR).toMatch(/closeMobile=\{closeMobile\}/);
  });

  it('RTL direction is driven by useLanguage (single source)', () => {
    expect(SIDEBAR).toContain("side={isRTL ? 'right' : 'left'}");
  });

  it('contains no hardcoded hex colors', () => {
    const hex = SIDEBAR.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    expect(hex).toEqual([]);
  });
});