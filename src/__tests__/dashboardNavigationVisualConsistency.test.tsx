import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const SIDEBAR = read('src/components/dashboard/DashboardSidebar.tsx');
const CONFIG  = read('src/modules/dashboard/navigation/dashboardNavigation.config.ts');

describe('DASHBOARD NAV — visual + source consistency', () => {
  it('sidebar consumes the unified navigation module', () => {
    expect(SIDEBAR).toMatch(/from\s+['"]@\/modules\/dashboard\/navigation['"]/);
    expect(SIDEBAR).toContain('getVisibleDashboardNavGroups');
  });

  it('sidebar no longer defines inline user/provider group arrays', () => {
    // The inline duplicates were the source of label drift. They are
    // collapsed to one-line re-exports from the config module.
    expect(SIDEBAR).not.toMatch(/const userGroups: MenuGroup\[\] = \[/);
    expect(SIDEBAR).not.toMatch(/const providerGroups: MenuGroup\[\] = \[/);
  });

  it('item button uses one canonical class string (h-11, rounded-xl, px-3)', () => {
    expect(SIDEBAR).toContain('h-11 min-h-[44px] rounded-xl px-3');
  });

  it('group-label class is shared across all rendered groups', () => {
    const matches = SIDEBAR.match(/text-\[10\.5px\] font-semibold uppercase tracking-\[0\.08em\]/g);
    expect(matches?.length ?? 0).toBeGreaterThanOrEqual(1);
  });

  it('icons render at h-4 w-4 in the menu item, h-3 w-3 in the group heading', () => {
    expect(SIDEBAR).toMatch(/className=\{?'?[^'`}]*h-4 w-4 shrink-0/);
    expect(SIDEBAR).toContain('w-3 h-3 opacity-70 shrink-0');
  });

  it('config does not hardcode hex colors', () => {
    expect(CONFIG).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('config does not contain any TS suppression markers', () => {
    for (const marker of ['@ts-ignore', '@ts-expect-error', 'eslint-disable', ' as any']) {
      expect(CONFIG).not.toContain(marker);
    }
  });
});