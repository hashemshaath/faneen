/**
 * CLIENT WORKSPACE UNIFICATION — Phase 1B visual + access QA guards.
 *
 * Static-source checks only. They lock in the visual/access invariants
 * verified by hand in P1B so future edits cannot silently regress:
 *
 *   - Both new routes are behind <ProtectedRoute> (no anon leak).
 *   - The detail Tabs list is mobile-safe (`flex-wrap h-auto`) so the
 *     six tab triggers wrap instead of overflowing on small screens.
 *   - A back-to-list affordance exists on the detail page.
 *   - The disabled create-contract CTA carries an explicit Arabic
 *     `aria-disabled` + helper copy (accessibility cue, not just CSS).
 *   - The list page renders cards with both kinds (project/site)
 *     handled via a single render path (no separate hidden lists).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const r = (p: string) => resolve(__dirname, '..', '..', p);
const APP = readFileSync(r('src/App.tsx'), 'utf8');
const LIST_PAGE = readFileSync(r('src/pages/dashboard/DashboardWorkspaces.tsx'), 'utf8');
const DETAIL_PAGE = readFileSync(
  r('src/pages/dashboard/DashboardWorkspaceDetail.tsx'),
  'utf8',
);
const CONTRACTS_TAB = readFileSync(
  r('src/components/workspace/WorkspaceContractsTab.tsx'),
  'utf8',
);

describe('P1B — access', () => {
  it('both workspace routes are wrapped by <ProtectedRoute>', () => {
    expect(APP).toMatch(
      /path="\/dashboard\/workspaces"\s+element=\{<ProtectedRoute>/,
    );
    expect(APP).toMatch(
      /path="\/dashboard\/workspaces\/:kind\/:id"\s+element=\{<ProtectedRoute>/,
    );
  });

  it('neither route is publicly accessible (no plain <Route> wiring)', () => {
    expect(APP).not.toMatch(
      /path="\/dashboard\/workspaces"\s+element=\{<DashboardWorkspaces/,
    );
    expect(APP).not.toMatch(
      /path="\/dashboard\/workspaces\/:kind\/:id"\s+element=\{<DashboardWorkspaceDetail/,
    );
  });
});

describe('P1B — mobile/RTL safety on the detail tabs', () => {
  it('TabsList uses flex-wrap + h-auto so 6 triggers wrap on mobile', () => {
    expect(DETAIL_PAGE).toMatch(/<TabsList[^>]*className="[^"]*flex-wrap[^"]*h-auto/);
  });

  it('detail page renders all 6 tabs', () => {
    for (const v of ['overview', 'files', 'contracts', 'licenses', 'violations', 'reports']) {
      expect(DETAIL_PAGE).toMatch(new RegExp(`value="${v}"`));
    }
  });

  it('detail page exposes a back link to /dashboard/workspaces', () => {
    expect(DETAIL_PAGE).toMatch(/to="\/dashboard\/workspaces"/);
  });
});

describe('P1B — conditional create-contract CTA accessibility', () => {
  it('CTA carries a dynamic aria-disabled tied to eligibility and a localized helper', () => {
    // Post-Phase-4: the CTA accessibility cue is bound to `eligible`,
    // and the helper copy explains the ineligibility cause (missing
    // provider link) in both Arabic and English.
    expect(CONTRACTS_TAB).toMatch(/aria-disabled=\{!eligible(\s*\|\|[^}]+)?\}/);
    expect(CONTRACTS_TAB).toMatch(
      /لا يمكن إنشاء عقد حتى يتم ربط المشروع بمزود خدمة/,
    );
    expect(CONTRACTS_TAB).toMatch(
      /A provider must be linked to this workspace before a contract can be created/,
    );
  });

  it('writes go through the service wrapper, never a direct RPC in the tab', () => {
    expect(CONTRACTS_TAB).not.toMatch(/\.rpc\(/);
  });
});

describe('P1B — list page uses a single unified render path', () => {
  it('cards render via a single `.map` over the unified workspaces list', () => {
    // exactly one `workspaces.map(` call — no separate hidden list for sites.
    const count = (LIST_PAGE.match(/workspaces\.map\(/g) ?? []).length;
    expect(count).toBe(1);
  });

  it('list page shows EmptyState when the unified list is empty', () => {
    expect(LIST_PAGE).toMatch(/EmptyState/);
    expect(LIST_PAGE).toMatch(/workspaces\.length === 0/);
  });
});