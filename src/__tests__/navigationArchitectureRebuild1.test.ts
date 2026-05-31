import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, act } from '@testing-library/react';

import {
  quickCreateActions,
  quickCreateFor,
  recommendedGroupOrder,
} from '../components/dashboard/navigation/menuArchitecture';
import { useSidebarFavorites, MAX_FAVORITES } from '../hooks/useSidebarFavorites';
import { pushRecent, MAX_RECENT } from '../hooks/useRecentRoutes';

/**
 * NAVIGATION-ARCHITECTURE-REBUILD-1 — Part J
 *
 * Guards the rebuild: route preservation, sidebar invariants, role
 * filtering, favorites / recent contracts, branding fallback, and the
 * absence of `/admin/identity?view=...` deep links in the sidebar.
 */

const root = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const SIDEBAR = readFileSync(resolve(root, 'src/components/dashboard/DashboardSidebar.tsx'), 'utf8');
const ARCH = readFileSync(
  resolve(root, 'src/components/dashboard/navigation/menuArchitecture.ts'),
  'utf8',
);

const registeredRoutes = (() => {
  const re = /path=["']([^"']+)["']/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(APP))) out.push(m[1]);
  return out;
})();

function matchesRoute(link: string): boolean {
  const clean = link.split('?')[0];
  if (registeredRoutes.includes(clean)) return true;
  return registeredRoutes.some((r) => {
    if (!r.includes(':')) return false;
    const re = new RegExp('^' + r.replace(/:[^/]+/g, '[^/]+') + '$');
    return re.test(clean);
  });
}

describe('Part A/H — route preservation', () => {
  it('quickCreateActions all resolve to registered routes', () => {
    const broken = quickCreateActions.filter((a) => !matchesRoute(a.url));
    expect(broken.map((a) => a.url)).toEqual([]);
  });

  it('quickCreateActions ids are unique', () => {
    const ids = quickCreateActions.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('exposes exactly five quick-create shortcuts (contract / quote / WO / RFQ / report)', () => {
    expect(quickCreateActions).toHaveLength(5);
    const ids = quickCreateActions.map((a) => a.id);
    expect(ids).toEqual(
      expect.arrayContaining(['qc-contract', 'qc-quote', 'qc-work-order', 'qc-rfq', 'qc-report']),
    );
  });
});

describe('Part C — recommended group order', () => {
  it('keeps Overview first and Account last', () => {
    expect(recommendedGroupOrder[0]).toBe('Overview');
    expect(recommendedGroupOrder[recommendedGroupOrder.length - 1]).toBe('Account');
  });

  it('contains the core operating-system pillars', () => {
    for (const g of [
      'Sales & Customers',
      'Contracts & Execution',
      'Procurement',
      'Memberships & Payments',
      'Communications',
      'Users & Businesses',
    ]) {
      expect(recommendedGroupOrder).toContain(g);
    }
  });
});

describe('Part E — role-based quick-create filtering', () => {
  it('users only see the "report issue" shortcut', () => {
    const forUser = quickCreateFor('user');
    expect(forUser.map((a) => a.id)).toEqual(['qc-report']);
  });

  it('providers and admins see all five shortcuts', () => {
    expect(quickCreateFor('provider')).toHaveLength(5);
    expect(quickCreateFor('admin')).toHaveLength(5);
  });
});

describe('Part D — favorites hook contract', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty when storage is empty', () => {
    const { result } = renderHook(() => useSidebarFavorites());
    expect(result.current.favorites).toEqual([]);
    expect(result.current.isFavorite('/dashboard')).toBe(false);
  });

  it('adds, removes, and toggles entries', () => {
    const { result } = renderHook(() => useSidebarFavorites());
    act(() => result.current.add('/dashboard/contracts'));
    expect(result.current.favorites).toEqual(['/dashboard/contracts']);
    act(() => result.current.toggle('/dashboard/leads'));
    expect(result.current.favorites[0]).toBe('/dashboard/leads');
    act(() => result.current.remove('/dashboard/contracts'));
    expect(result.current.favorites).toEqual(['/dashboard/leads']);
  });

  it(`caps favorites at MAX_FAVORITES (${MAX_FAVORITES})`, () => {
    const { result } = renderHook(() => useSidebarFavorites());
    act(() => {
      for (let i = 0; i < MAX_FAVORITES + 5; i++) result.current.add(`/dashboard/x-${i}`);
    });
    expect(result.current.favorites).toHaveLength(MAX_FAVORITES);
  });

  it('persists across hook remounts via localStorage', () => {
    const a = renderHook(() => useSidebarFavorites());
    act(() => a.result.current.add('/dashboard/contracts'));
    const b = renderHook(() => useSidebarFavorites());
    expect(b.result.current.favorites).toEqual(['/dashboard/contracts']);
  });
});

describe('Part D — recent routes pure helper', () => {
  it('prepends new paths and dedupes', () => {
    const out = pushRecent(['/dashboard/leads'], '/dashboard/contracts');
    expect(out).toEqual(['/dashboard/contracts', '/dashboard/leads']);
    const out2 = pushRecent(out, '/dashboard/leads');
    expect(out2).toEqual(['/dashboard/leads', '/dashboard/contracts']);
  });

  it('skips ignored prefixes (auth, tokens, no-access, etc.)', () => {
    expect(pushRecent([], '/auth')).toEqual([]);
    expect(pushRecent([], '/q/abc')).toEqual([]);
    expect(pushRecent([], '/dashboard/no-access')).toEqual([]);
    expect(pushRecent([], '/onboarding')).toEqual([]);
  });

  it('only tracks dashboard / admin routes', () => {
    expect(pushRecent([], '/about')).toEqual([]);
    expect(pushRecent([], '/dashboard/contracts')).toEqual(['/dashboard/contracts']);
    expect(pushRecent([], '/admin/identity')).toEqual(['/admin/identity']);
  });

  it(`caps recents at MAX_RECENT (${MAX_RECENT})`, () => {
    let list: string[] = [];
    for (let i = 0; i < MAX_RECENT + 5; i++) {
      list = pushRecent(list, `/dashboard/p-${i}`);
    }
    expect(list).toHaveLength(MAX_RECENT);
  });
});

describe('Part F — branding fallback', () => {
  it('SidebarBrand renders the "ق" letter mark when no logo is provided', async () => {
    const mod = await import('../components/dashboard/navigation/SidebarBrand');
    expect(typeof mod.SidebarBrand).toBe('function');
    // Source-level check — verify the fallback glyph is wired.
    const src = readFileSync(
      resolve(root, 'src/components/dashboard/navigation/SidebarBrand.tsx'),
      'utf8',
    );
    expect(src).toContain('ق');
    expect(src).toContain('businessLogoUrl');
    expect(src).toContain('fallback');
  });
});

describe('Part B — sidebar invariants', () => {
  it('mounts SidebarBrand, SidebarQuickCreate, SidebarFavorites', () => {
    expect(SIDEBAR).toContain('<SidebarBrand');
    expect(SIDEBAR).toContain('<SidebarQuickCreate');
    expect(SIDEBAR).toContain('<SidebarFavorites');
  });

  it('no /admin/identity?view=... deep links remain anywhere in the sidebar', () => {
    expect(SIDEBAR).not.toMatch(/\/admin\/identity\?view=/);
  });

  it('quickCreate shortcuts use icons from lucide-react (no inline JSX)', () => {
    expect(ARCH).toMatch(/from\s+['"]lucide-react['"]/);
    expect(ARCH).not.toMatch(/icon:\s*</);
  });
});