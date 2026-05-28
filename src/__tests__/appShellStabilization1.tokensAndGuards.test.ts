import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { shellClassesFor, SHELL_TOUCH_TARGET, SHELL_TOUCH_TARGET_COMPACT } from '@/modules/workspace/shell/shellTokens';
import { SHELL_CARD, SHELL_PAGE_CONTAINER } from '@/modules/workspace/shell/shellSpacing';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('APP-SHELL-STAB-1 — tokens', () => {
  it('compact vs default class bundles differ', () => {
    const compact = shellClassesFor(true);
    const normal  = shellClassesFor(false);
    expect(compact).not.toEqual(normal);
    expect(compact.touch).toBe(SHELL_TOUCH_TARGET_COMPACT);
    expect(normal.touch).toBe(SHELL_TOUCH_TARGET);
  });

  it('composed spacing presets are non-empty', () => {
    expect(SHELL_CARD.length).toBeGreaterThan(0);
    expect(SHELL_PAGE_CONTAINER.length).toBeGreaterThan(0);
  });
});

describe('APP-SHELL-STAB-1 — memoized shell components', () => {
  it.each([
    'src/components/workspace/shell/QuickActionGrid.tsx',
    'src/components/workspace/shell/RecentWorkspaceContext.tsx',
    'src/components/workspace/shell/RecentWorkspaceFlows.tsx',
  ])('%s is wrapped in React.memo', (f) => {
    const src = read(f);
    expect(src).toMatch(/React\.memo\(/);
    expect(src).toMatch(/displayName\s*=/);
  });
});

describe('APP-SHELL-STAB-1 — DashboardLayout mounts scroll restoration + reduced-motion data attr', () => {
  it('layout includes WorkspaceScrollRestoration and data-reduced-motion', () => {
    const src = read('src/components/dashboard/DashboardLayout.tsx');
    expect(src).toMatch(/<WorkspaceScrollRestoration\s*\/?>/);
    expect(src).toMatch(/data-reduced-motion=/);
    expect(src).toMatch(/data-compact-mode=/);
  });
});