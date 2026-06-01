import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('PRICING-SOURCE-OF-TRUTH-1', () => {
  describe('No hardcoded prices in public surfaces', () => {
    const files = [
      'src/pages/Membership.tsx',
      'src/components/membership/PlanCard.tsx',
      'src/components/membership/SubscribeStepper.tsx',
      'src/components/membership/MembershipHeader.tsx',
      'src/components/membership/MembershipHero.tsx',
    ];
    for (const f of files) {
      it(`${f} contains no hardcoded SAR amounts`, () => {
        const src = read(f);
        // Disallow patterns like "99 SAR", "249 ر.س", "990 ريال" — prices must come from plan data.
        expect(src).not.toMatch(/\b\d{2,5}\s*(SAR|ر\.س|ريال)\b/);
        // Disallow stale launch / beta marketing claims in user-facing strings.
        expect(src).not.toMatch(/launch offer|عرض الإطلاق|نسخة\s*تجريبية|beta\s*offer/i);
      });
    }
  });

  describe('PlanCard treats missing prices safely', () => {
    const src = read('src/components/membership/PlanCard.tsx');
    it('distinguishes truly-free plans from missing prices', () => {
      expect(src).toMatch(/isTrulyFree/);
      expect(src).toMatch(/isPriceMissing/);
    });
    it('renders contact-us copy when a cycle price is missing', () => {
      expect(src).toMatch(/تواصل معنا/);
      expect(src).toMatch(/Contact us/);
    });
    it('disables the subscribe CTA when price is missing', () => {
      expect(src).toMatch(/disabled=\{[^}]*isPriceMissing[^}]*\}/);
    });
    it('accepts null/undefined prices in its PlanCardPlan type', () => {
      expect(src).toMatch(/price_monthly:\s*number\s*\|\s*null/);
      expect(src).toMatch(/price_yearly:\s*number\s*\|\s*null/);
    });
  });

  describe('MembershipHeader hides yearly toggle when unavailable', () => {
    const src = read('src/components/membership/MembershipHeader.tsx');
    it('computes yearlyAvailable from plan data', () => {
      expect(src).toMatch(/yearlyAvailable/);
      expect(src).toMatch(/price_yearly\s*\?\?\s*0/);
    });
    it('snaps back to monthly when yearly disappears', () => {
      expect(src).toMatch(/useEffect/);
      expect(src).toMatch(/setBillingCycle\('monthly'\)/);
    });
    it('does not show fake annual discount when no yearly plan exists', () => {
      expect(src).toMatch(/yearlyAvailable && savingsPct > 0/);
    });
  });

  describe('JSON-LD pricing reads only from plan data', () => {
    const src = read('src/pages/Membership.tsx');
    it('priceCurrency = SAR is sourced once for the AggregateOffer', () => {
      expect(src).toMatch(/priceCurrency:\s*'SAR'/);
    });
    it('individual offers read price_monthly / price_yearly from plan objects', () => {
      expect(src).toMatch(/plan\.price_monthly\s*\?\?\s*0/);
      expect(src).toMatch(/plan\.price_yearly\s*\?\?\s*0/);
    });
  });

  describe('Governance preservation', () => {
    const src = read('src/pages/Membership.tsx');
    it('still respects useMembershipVisibility / membershipPathOrNull', () => {
      expect(src).toMatch(/useMembershipVisibility|membershipPathOrNull/);
    });
    it('still renders MembershipPlanModuleMatrix', () => {
      expect(src).toMatch(/MembershipPlanModuleMatrix/);
    });
  });

  describe('No user-facing beta/launch copy', () => {
    const files = [
      'src/pages/Membership.tsx',
      'src/components/membership/MembershipPaymentStatus.tsx',
    ];
    for (const f of files) {
      it(`${f} has no "beta activation" user-facing copy`, () => {
        const src = read(f);
        // Allow internal identifiers like `manual_revoke`; ban marketing copy.
        expect(src).not.toMatch(/Beta\s+activation/);
        expect(src).not.toMatch(/تفعيل\s+تجريبي/);
      });
    }
  });
});