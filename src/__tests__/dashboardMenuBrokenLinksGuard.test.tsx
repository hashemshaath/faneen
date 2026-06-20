import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * PHASE B — broken-links guard for the dashboard sidebar.
 *
 * Static checks (no React render): parse `DashboardSidebar.tsx` to
 * extract every `url: '...'` entry from `userGroups` / `providerGroups`
 * and verify it resolves to a registered `<Route path="...">` in
 * `App.tsx`. Also enforces the registration policy for
 * `/register-entity` (creation) vs `/onboarding` (completion only),
 * and forbids hardcoded hex colors / TS suppressions in the sidebar
 * surface files.
 */

const root = resolve(__dirname, '..', '..');
const APP = readFileSync(resolve(root, 'src/App.tsx'), 'utf8');
const SIDEBAR_PATH = resolve(root, 'src/components/dashboard/DashboardSidebar.tsx');
const SIDEBAR = readFileSync(SIDEBAR_PATH, 'utf8');
const UNIFIED_LABELS = readFileSync(
  resolve(root, 'src/components/dashboard/navigation/unifiedLabels.ts'),
  'utf8',
);

const APP_ROUTES = [...APP.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);

function routeRegistered(link: string): boolean {
  const clean = link.split('?')[0].split('#')[0];
  if (APP_ROUTES.includes(clean)) return true;
  return APP_ROUTES.some((r) => {
    if (!r.includes(':')) return false;
    return new RegExp('^' + r.replace(/:[^/]+/g, '[^/]+') + '$').test(clean);
  });
}

function extractSidebarUrls(): string[] {
  const urls = new Set<string>();
  for (const m of SIDEBAR.matchAll(/url:\s*'([^']+)'/g)) {
    urls.add(m[1]);
  }
  return [...urls].sort();
}

const SIDEBAR_URLS = extractSidebarUrls();

describe('PHASE B — dashboard sidebar broken-links guard', () => {
  it('extracts a non-trivial number of sidebar URLs', () => {
    expect(SIDEBAR_URLS.length).toBeGreaterThan(15);
  });

  it('every sidebar URL resolves to a registered route in App.tsx', () => {
    const broken = SIDEBAR_URLS.filter((u) => u.startsWith('/') && !routeRegistered(u));
    expect(broken, `broken sidebar links:\n${broken.join('\n')}`).toEqual([]);
  });

  it('/dashboard/membership is registered (user surface lands here)', () => {
    expect(APP_ROUTES).toContain('/dashboard/membership');
  });

  it('/admin/provider-leads is registered', () => {
    expect(APP_ROUTES).toContain('/admin/provider-leads');
  });

  it('/admin/data-enrichment is registered (admin-only)', () => {
    expect(APP_ROUTES).toContain('/admin/data-enrichment');
  });

  it('/admin/system-settings is registered (admin-only)', () => {
    expect(APP_ROUTES).toContain('/admin/system-settings');
  });
});

describe('PHASE B — entity creation vs completion policy', () => {
  it('/register-entity is the only sidebar entry-point for creating a business', () => {
    expect(UNIFIED_LABELS).toContain("CREATE_ENTITY_ROUTE = '/register-entity'");
    expect(SIDEBAR).toContain('CREATE_ENTITY_ROUTE');
  });

  it('sidebar never links to /onboarding (completion-only route)', () => {
    expect(SIDEBAR).not.toMatch(/to=["']\/onboarding["']/);
    expect(SIDEBAR).not.toMatch(/url:\s*['"]\/onboarding['"]/);
  });
});

describe('PHASE B — sidebar hygiene', () => {
  it('contains no hardcoded hex color values', () => {
    // Allow CSS variable refs and unicode escapes; only flag `#RRGGBB`-style literals.
    const hex = SIDEBAR.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
    expect(hex, `hex literals found: ${hex.join(', ')}`).toEqual([]);
  });

  it('contains no TS suppressions or eslint-disable comments', () => {
    expect(SIDEBAR).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable|\bas\s+any\b/);
  });
});

describe('PHASE B — no duplicate labels per concept', () => {
  it('no two distinct sidebar URLs share the same Arabic label', () => {
    // Pair each `label: { ar: '...', en: '...' }` block with the next url after it.
    const blocks = [...SIDEBAR.matchAll(
      /label:\s*(?:UNIFIED_ITEM_LABELS\.(\w+)|\{\s*ar:\s*'([^']+)'[^}]*\})[^}]*?url:\s*'([^']+)'/g,
    )];
    const byLabel = new Map<string, Set<string>>();
    for (const m of blocks) {
      const labelKey = m[1] ?? m[2];
      const url = m[3];
      if (!labelKey) continue;
      const set = byLabel.get(labelKey) ?? new Set<string>();
      set.add(url);
      byLabel.set(labelKey, set);
    }
    // Legitimate cross-role pairs that map the same concept to a
    // role-scoped route. Both surfaces are correct — never both
    // visible to the same user at the same time.
    const ALLOWED_CROSS_ROLE_PAIRS: Record<string, ReadonlyArray<string>> = {
      membership: ['/dashboard/membership', '/dashboard/provider/membership'],
    };
    const dupes = [...byLabel.entries()]
      .filter(([, urls]) => urls.size > 1)
      .filter(([label, urls]) => {
        const allowed = ALLOWED_CROSS_ROLE_PAIRS[label];
        if (!allowed) return true;
        return [...urls].some((u) => !allowed.includes(u));
      })
      .map(([label, urls]) => `${label} → ${[...urls].join(', ')}`);
    expect(dupes, `duplicate labels:\n${dupes.join('\n')}`).toEqual([]);
  });
});