/**
 * APP-SHELL-REARCHITECTURE-1 — source-level guardrails.
 *
 * Ensures shell primitives stay UX-only:
 *  - no direct supabase.from / .rpc(
 *  - no imports from forbidden domains (payments/membership/realtime/cron)
 *  - no page directly mounts WorkspaceHeader / WorkspaceContextBar
 *    (must come from DashboardLayout)
 *  - DashboardLayout mounts the shell primitives
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const SHELL_FILES = [
  'src/components/workspace/shell/WorkspaceHeader.tsx',
  'src/components/workspace/shell/WorkspaceContextBar.tsx',
  'src/components/workspace/shell/WorkspaceSearchLauncher.tsx',
  'src/components/workspace/shell/RecentWorkspaceContext.tsx',
  'src/components/workspace/shell/QuickActionGrid.tsx',
  'src/components/workspace/shell/CommandPalette.tsx',
  // APP-SHELL-2 additions:
  'src/components/workspace/shell/SmartEntitySwitcher.tsx',
  'src/components/workspace/shell/RecentWorkspaceFlows.tsx',
  'src/components/workspace/shell/MobileWorkspaceActions.tsx',
  'src/hooks/useCommandPalette.ts',
  'src/hooks/useBreadcrumbs.ts',
  'src/hooks/useWorkspaceState.ts',
  'src/hooks/useWorkspaceContext.ts',
  'src/modules/workspace/shell/refRouteMap.ts',
  'src/modules/workspace/shell/recentContextStore.ts',
  'src/modules/workspace/shell/quickActions.ts',
  'src/modules/workspace/shell/contextualQuickActions.ts',
  'src/modules/workspace/state/workspaceStateStore.ts',
  // APP-SHELL-STABILIZATION-1 additions:
  'src/modules/workspace/shell/shellTokens.ts',
  'src/modules/workspace/shell/shellSpacing.ts',
  'src/components/workspace/shell/WorkspacePageSkeleton.tsx',
  'src/components/workspace/shell/WorkspaceSectionSkeleton.tsx',
  'src/components/workspace/shell/WorkspaceScrollRestoration.tsx',
  'src/hooks/useWorkspacePreferences.ts',
];

const FORBIDDEN_IMPORT_PATTERNS = [
  /from\s+['"]@\/modules\/payments/,
  /from\s+['"]@\/modules\/memberships/,
  /from\s+['"]@\/modules\/realtime/,
  /from\s+['"]@\/modules\/cron/,
  // Realtime / cron specific subscriptions are flagged anywhere they appear
  /supabase\.channel\(/,
];

describe('APP-SHELL-1 — shell primitives are UX-only', () => {
  it.each(SHELL_FILES)('%s has no direct DB calls', (f) => {
    const src = read(f);
    expect(src, `${f} must not call supabase.from`).not.toMatch(/supabase\.from\(/);
    expect(src, `${f} must not call supabase.rpc`).not.toMatch(/supabase\.rpc\(/);
  });

  it.each(SHELL_FILES)('%s has no forbidden imports', (f) => {
    const src = read(f);
    for (const pat of FORBIDDEN_IMPORT_PATTERNS) {
      expect(src, `${f} must not match ${pat}`).not.toMatch(pat);
    }
  });
});

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else if (/\.tsx?$/.test(name)) yield p;
  }
}

describe('APP-SHELL-1 — no page imports shell primitives directly', () => {
  const layoutPath = resolve(ROOT, 'src/components/dashboard/DashboardLayout.tsx');
  const banned = ['WorkspaceHeader', 'WorkspaceContextBar', 'CommandPalette'];
  const pageDirs = [resolve(ROOT, 'src/pages')];

  it('only DashboardLayout mounts WorkspaceHeader/WorkspaceContextBar/CommandPalette', () => {
    const offenders: string[] = [];
    for (const dir of pageDirs) {
      for (const file of walk(dir)) {
        const src = readFileSync(file, 'utf8');
        for (const b of banned) {
          if (new RegExp(`<${b}[\\s/>]`).test(src) || new RegExp(`from ['\"]@/components/workspace/shell/${b}`).test(src)) {
            offenders.push(`${file} imports ${b}`);
          }
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);

    // DashboardLayout must mount all three
    const layoutSrc = readFileSync(layoutPath, 'utf8');
    for (const b of banned) {
      expect(layoutSrc, `DashboardLayout missing <${b}>`).toMatch(new RegExp(`<${b}[\\s/>]`));
    }
  });
});