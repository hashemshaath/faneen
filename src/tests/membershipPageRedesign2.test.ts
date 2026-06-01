/**
 * MEMBERSHIP-PAGE-REDESIGN-2 — static structure & claim-safety tests.
 *
 * File-shape assertions only (no React render). They lock in:
 *   - the spec hero (title + CTAs + safe note) is mounted,
 *   - the in-page anchor `#compare` exists and is targeted,
 *   - the Service Activation Alignment section is mounted,
 *   - the feature matrix is data-driven (real `membership_plans.limits`),
 *   - hidden plans are not shown (active-only read wrapper),
 *   - no fabricated guarantees / launch offers / legal/PDPL claims,
 *   - governance guard from REDESIGN-1 is preserved.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf8');

describe('MEMBERSHIP-PAGE-REDESIGN-2', () => {
  it('mounts the new MembershipHero with spec title + dual CTAs', () => {
    const hero = read('src/components/membership/MembershipHero.tsx');
    expect(hero).toContain('عضويات قطاعات');
    expect(hero).toContain('قارن العضويات');
    expect(hero).toContain('تواصل معنا');
    // Safe note about benefit variability.
    expect(hero).toContain('قد تختلف بعض المزايا حسب إعدادات الحساب');
    // Secondary CTA must point to /contact, not to an admin/internal route.
    expect(hero).toMatch(/to="\/contact"/);
    // Page mounts the hero and the compare anchor.
    const page = read('src/pages/Membership.tsx');
    expect(page).toContain('<MembershipHero');
    expect(page).toMatch(/id="compare"/);
    expect(page).toContain('ServiceActivationAlignment');
  });

  it('exposes a Service Activation Alignment section with safe expectations', () => {
    const src = read('src/components/membership/ServiceActivationAlignment.tsx');
    expect(src).toContain('بعض الخدمات قد تتطلب خطة أعلى');
    expect(src).toContain('تخضع لمراجعة من إدارة قطاعات');
    expect(src).toContain('يمكن أن تتوقف الخدمة مؤقتًا');
    expect(src).toContain('لا تعني ضمان الطلبات أو المبيعات');
  });

  it('feature matrix is data-driven (real plan limits, no fabricated numbers)', () => {
    const matrix = read('src/components/membership/PlanFeatureMatrix.tsx');
    expect(matrix).toContain('listActiveMembershipPlans');
    expect(matrix).toContain('parseLimits');
    expect(matrix).toContain('getPlanLimitDisplayValue');
    // The matrix is rendered on the page inside the #compare anchor.
    const page = read('src/pages/Membership.tsx');
    expect(page).toMatch(/id="compare"[\s\S]{0,400}FeatureComparisonTable/);
  });

  it('reads plans through the active-only wrapper (no hidden/inactive plans leak)', () => {
    const reads = read('src/modules/memberships/services/plans/reads.ts');
    expect(reads).toContain("is_active");
    const page = read('src/pages/Membership.tsx');
    expect(page).toContain('listActiveMembershipPlans');
  });

  it('does not introduce guarantees, legal/PDPL/hosting claims, or invented launch offers', () => {
    const surfaces = [
      'src/components/membership/MembershipHero.tsx',
      'src/components/membership/ServiceActivationAlignment.tsx',
      'src/pages/Membership.tsx',
    ];
    const forbidden = [
      'guaranteed leads', 'guaranteed sales', 'ضمان الطلبات والمبيعات',
      'PDPL', 'متوافق مع نظام حماية البيانات', 'launch offer', 'عرض الإطلاق',
      'Talk to sales',
    ];
    for (const f of surfaces) {
      const s = read(f);
      for (const claim of forbidden) {
        expect(s, `${f} must not contain "${claim}"`).not.toContain(claim);
      }
    }
  });

  it('preserves REDESIGN-1 governance guard (hidden module → unavailable state only)', () => {
    const page = read('src/pages/Membership.tsx');
    expect(page).toContain('useMembershipVisibility');
    expect(page).toContain('MembershipUnavailableState');
    expect(page).toMatch(/!membershipVisibility\.canShowMembershipPage[\s\S]*MembershipUnavailableState/);
  });

  it('adds the by-service-type FAQ entry while keeping all governance FAQs', () => {
    const faq = read('src/components/membership/MembershipFAQ.tsx');
    expect(faq).toContain('هل تختلف المزايا حسب نوع الخدمة');
    expect(faq).toContain('Do benefits differ by service type?');
    expect(faq).toContain('Does membership guarantee leads or sales?');
    expect(faq).toContain('What happens if memberships are temporarily unavailable?');
  });

  it('final CTA uses the redesigned copy and scrolls to the compare anchor', () => {
    const page = read('src/pages/Membership.tsx');
    expect(page).toContain('اختر العضوية المناسبة');
    expect(page).not.toContain('تحدث مع المبيعات');
    expect(page).toMatch(/getElementById\('compare'\)/);
  });
});