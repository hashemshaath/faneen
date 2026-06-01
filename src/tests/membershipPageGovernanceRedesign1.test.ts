/**
 * MEMBERSHIP-PAGE-GOVERNANCE-REDESIGN-1 — static governance tests.
 *
 * These are file-shape assertions (no React render required) to guarantee:
 *   - the central visibility hook exists and exposes the documented API,
 *   - every non-admin upgrade CTA branches on `membershipPathOrNull`,
 *   - the unsafe / contradictory copy was removed,
 *   - the governance-safe FAQ items are present.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('MEMBERSHIP-PAGE-GOVERNANCE-REDESIGN-1', () => {
  it('exposes a central visibility hook with the documented API', () => {
    const src = read('src/hooks/useMembershipVisibility.ts');
    for (const symbol of [
      'canShowMembershipPage',
      'shouldShowUpgradeCTA',
      'membershipPathOrNull',
      'unavailableMessage',
      'isAdminBypass',
      'MEMBERSHIP_ROUTE',
    ]) {
      expect(src).toContain(symbol);
    }
    // Hook must defer to useVisibleModules (canonical admin module catalog).
    expect(src).toMatch(/useVisibleModules/);
    // Admin bypass must be present so admins can still QA the page.
    expect(src).toMatch(/isAdmin/);
  });

  it('renders the unavailable state when membership module is hidden', () => {
    const page = read('src/pages/Membership.tsx');
    expect(page).toContain('useMembershipVisibility');
    expect(page).toContain('MembershipUnavailableState');
    // Route guard must short-circuit BEFORE rendering plan cards.
    expect(page).toMatch(/!membershipVisibility\.canShowMembershipPage[\s\S]*MembershipUnavailableState/);
    // Unavailable state must be noindex.
    const unavailable = read('src/components/membership/MembershipUnavailableState.tsx');
    expect(unavailable).toContain('useNoIndex');
    expect(unavailable).toContain('/contact');
  });

  it('every non-admin upgrade CTA branches on membership visibility', () => {
    const files = [
      'src/components/membership/FeatureGate.tsx',
      'src/components/dashboard/ProviderMembershipCard.tsx',
      'src/components/dashboard/overview/shared.tsx',
      'src/pages/dashboard/ProviderMembership.tsx',
      'src/pages/dashboard/DashboardServices.tsx',
      'src/pages/ForProviders.tsx',
      'src/pages/dashboard/DashboardProfile.tsx',
    ];
    for (const f of files) {
      const src = read(f);
      expect(src, `${f} must import useMembershipVisibility`).toContain('useMembershipVisibility');
      // No remaining un-guarded hard-coded `Link to="/membership"` in
      // these CTA sites — every reference must go through the helper.
      const hardLinks = src.match(/to="\/membership"/g) ?? [];
      expect(hardLinks.length, `${f} still hard-links to /membership`).toBe(0);
    }
  });

  it('removes unsafe / contradictory marketing copy', () => {
    const page = read('src/pages/Membership.tsx');
    expect(page).not.toContain('Join hundreds of businesses that trust Qitaat');
    expect(page).not.toContain('انضم لمئات المنشآت');
    const faq = read('src/components/membership/MembershipFAQ.tsx');
    expect(faq).not.toContain('We are currently in beta');
    expect(faq).not.toContain('حالياً نحن في النسخة التجريبية');
    const card = read('src/components/dashboard/ProviderMembershipCard.tsx');
    expect(card).not.toContain('Beta — upgrades are manually activated for now');
    expect(card).not.toContain('نسخة تجريبية — يتم تفعيل الترقيات يدوياً');
  });

  it('adds the governance-safe FAQ entries', () => {
    const faq = read('src/components/membership/MembershipFAQ.tsx');
    expect(faq).toContain('Does membership guarantee leads or sales?');
    expect(faq).toContain('Why do some services show as requiring an upgrade?');
    expect(faq).toContain('Do all brands and sectors appear instantly?');
    expect(faq).toContain('Are contracts and quote requests available on every plan?');
    expect(faq).toContain('What happens if memberships are temporarily unavailable?');
    // Arabic counterparts.
    expect(faq).toContain('هل العضوية تضمن وصول طلبات أو مبيعات');
  });

  it('adds the public governance-safe disclaimer above the plan grid', () => {
    const page = read('src/pages/Membership.tsx');
    expect(page).toContain('قد تختلف بعض المزايا حسب إعدادات الحساب');
    expect(page).toContain('ولا تعني ضمان الطلبات أو المبيعات');
  });
});