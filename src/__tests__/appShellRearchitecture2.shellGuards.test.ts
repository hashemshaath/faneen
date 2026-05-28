/**
 * APP-SHELL-REARCHITECTURE-2 — source-level guardrails for the
 * new workspace-state + context layer.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const SHELL2_FILES = [
  'src/modules/workspace/state/workspaceStateStore.ts',
  'src/modules/workspace/shell/contextualQuickActions.ts',
  'src/hooks/useWorkspaceState.ts',
  'src/hooks/useWorkspaceContext.ts',
  'src/components/workspace/shell/SmartEntitySwitcher.tsx',
  'src/components/workspace/shell/RecentWorkspaceFlows.tsx',
  'src/components/workspace/shell/MobileWorkspaceActions.tsx',
];

const FORBIDDEN = [
  /supabase\.from\(/,
  /supabase\.rpc\(/,
  /supabase\.channel\(/,
  /from\s+['"]@\/modules\/payments/,
  /from\s+['"]@\/modules\/memberships/,
  /from\s+['"]@\/modules\/realtime/,
  /from\s+['"]@\/modules\/cron/,
  /from\s+['"]@\/modules\/analytics/,
];

describe('APP-SHELL-2 — state/context layer is UX-only', () => {
  it.each(SHELL2_FILES)('%s has no forbidden references', (f) => {
    const src = read(f);
    for (const pat of FORBIDDEN) {
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

describe('APP-SHELL-2 — only DashboardLayout mounts shell-2 widgets', () => {
  const layoutPath = resolve(ROOT, 'src/components/dashboard/DashboardLayout.tsx');
  const banned = ['MobileWorkspaceActions', 'RecentWorkspaceFlows'];

  it('no page mounts these components directly', () => {
    const offenders: string[] = [];
    for (const file of walk(resolve(ROOT, 'src/pages'))) {
      const src = readFileSync(file, 'utf8');
      for (const b of banned) {
        if (new RegExp(`<${b}[\\s/>]`).test(src) || new RegExp(`from ['\"]@/components/workspace/shell/${b}`).test(src)) {
          offenders.push(`${file} imports ${b}`);
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
    const layoutSrc = readFileSync(layoutPath, 'utf8');
    for (const b of banned) {
      expect(layoutSrc, `DashboardLayout missing <${b}>`).toMatch(new RegExp(`<${b}[\\s/>]`));
    }
  });
});

describe('APP-SHELL-2 — no route path changes shipped', () => {
  it('contextual quick actions only target existing dashboard/admin routes', () => {
    const src = read('src/modules/workspace/shell/contextualQuickActions.ts');
    const matches = [...src.matchAll(/to:\s*`([^`?]+)/g)].map((m) => m[1]);
    for (const route of matches) {
      expect(route.startsWith('/dashboard') || route.startsWith('/admin')).toBe(true);
    }
  });
});