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

  // SIDEBAR IA SNAPSHOT DRIFT CLOSEOUT (token evolution):
  // The shipped sidebar section heading uses the design-tokens-system
  // tokens `text-xs font-semibold tracking-wide` for the group label,
  // with `text-[10.5px]` reserved for the group description below the
  // label. The earlier `uppercase tracking-[0.08em]` was dropped to
  // match the lower-case bilingual labels (Arabic has no uppercase).
  it('section heading uses the shipped typography tokens', () => {
    expect(SIDEBAR).toContain('text-xs font-semibold tracking-wide');
    expect(SIDEBAR).toContain('text-[10.5px]'); // group description tier
  });

  it('renders menu items via the single RenderMenu component', () => {
    // SIDEBAR IA SNAPSHOT DRIFT CLOSEOUT: the shell now invokes the
    // shared RenderMenu twice — once for admin pinned shortcuts and
    // once for the grouped list. Both invocations share the same
    // component; the invariant being asserted is "single renderer", not
    // "single call site".
    expect(SIDEBAR).toMatch(/const RenderMenu:\s*React\.FC/);
    const matches = SIDEBAR.match(/<RenderMenu\b/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('menu item uses the unified height + radius + spacing tokens', () => {
    // SIDEBAR IA SNAPSHOT DRIFT CLOSEOUT: shipped tokens are
    // h-10/min-h-[40px]/rounded-xl/px-3/gap-3 (tightened from the
    // earlier 44px row to align with admin shell density).
    expect(SIDEBAR).toContain('h-10 min-h-[40px] rounded-xl px-3 gap-3');
  });

  it('active state uses the unified semantic gradient + ring', () => {
    expect(SIDEBAR).toContain('from-primary/15 to-primary/[0.04]');
    expect(SIDEBAR).toContain('ring-1 ring-primary/20');
  });

  it('hover state uses sidebar-accent tokens (no hardcoded color)', () => {
    expect(SIDEBAR).toContain('hover:bg-sidebar-accent');
  });

  it('icons in menu items use a single size token (h-5 w-5)', () => {
    // SIDEBAR IA SNAPSHOT DRIFT CLOSEOUT: menu-item icons were bumped
    // to h-5/w-5 to match the post-redesign typography scale; the
    // assertion just enforces a single canonical size token, not the
    // specific 4px value.
    expect(SIDEBAR).toMatch(/<item\.icon className=\{\s*\n?\s*'h-5 w-5 shrink-0/);
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