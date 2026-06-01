import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PRICING-PRODUCT-SIGNOFF-1
 *
 * Locks the public pricing display surface so future changes can't silently:
 *   - hardcode prices,
 *   - reintroduce launch/beta/manual-activation marketing copy,
 *   - render "Free" as a substitute for a missing price,
 *   - bypass the Contact-us fallback,
 *   - claim a discount/guarantee tied to pricing.
 *
 * Numeric product-owner approval lives in
 * `docs/pricing-product-signoff-1.md`; this suite asserts the safety
 * envelope only.
 */

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const PUBLIC_UI = [
  'src/pages/Membership.tsx',
  'src/components/membership/PlanCard.tsx',
  'src/components/membership/MembershipHeader.tsx',
  'src/components/membership/MembershipHero.tsx',
  'src/components/membership/SubscribeStepper.tsx',
  'src/components/membership/MembershipFAQ.tsx',
  'src/components/membership/PlanFeatureMatrix.tsx',
  'src/components/membership/MembershipPlanModuleMatrix.tsx',
];

describe('PRICING-PRODUCT-SIGNOFF-1', () => {
  describe('signoff document exists', () => {
    it('docs/pricing-product-signoff-1.md is present', () => {
      expect(existsSync(join(ROOT, 'docs/pricing-product-signoff-1.md'))).toBe(true);
    });

    it('records the DB-confirmed monthly prices for traceability', () => {
      const doc = read('docs/pricing-product-signoff-1.md');
      for (const v of ['99', '249', '499', '990', '2490', '4990']) {
        expect(doc).toContain(v);
      }
      expect(doc).toContain('SAR');
      expect(doc).toMatch(/PARTIAL PASS|Approved by/);
    });
  });

  describe('no hardcoded prices in public UI', () => {
    for (const f of PUBLIC_UI) {
      it(`${f} contains no hardcoded SAR amounts`, () => {
        const src = read(f);
        expect(src).not.toMatch(/\b\d{2,5}\s*(SAR|ر\.س|ريال)\b/);
      });
    }
  });

  describe('no launch / beta / manual activation marketing claims', () => {
    for (const f of PUBLIC_UI) {
      it(`${f} has no launch/beta/manual-activation user-facing copy`, () => {
        const src = read(f);
        expect(src).not.toMatch(/launch offer|عرض الإطلاق/i);
        expect(src).not.toMatch(/beta\s*(offer|activation)/i);
        expect(src).not.toMatch(/تفعيل\s*تجريبي/);
        expect(src).not.toMatch(/manual\s+activation/i);
      });
    }
  });

  describe('no fake discount / guarantee claims tied to pricing', () => {
    for (const f of PUBLIC_UI) {
      it(`${f} contains no money-back / guarantee marketing copy`, () => {
        const src = read(f);
        expect(src).not.toMatch(/money[-\s]?back/i);
        expect(src).not.toMatch(/ضمان\s+استرداد/);
        expect(src).not.toMatch(/guaranteed\s+(leads|sales|results)/i);
      });
    }
  });

  describe('PlanCard preserves the Contact-us fallback', () => {
    const src = read('src/components/membership/PlanCard.tsx');
    it('still distinguishes truly-free from missing prices', () => {
      expect(src).toMatch(/isTrulyFree/);
      expect(src).toMatch(/isPriceMissing/);
      expect(src).toMatch(/تواصل معنا/);
      expect(src).toMatch(/Contact us/);
    });
    it('still disables the CTA when price is missing', () => {
      expect(src).toMatch(/disabled=\{[^}]*isPriceMissing[^}]*\}/);
    });
  });

  describe('yearly toggle remains DB-driven', () => {
    const src = read('src/components/membership/MembershipHeader.tsx');
    it('computes yearlyAvailable from plan data', () => {
      expect(src).toMatch(/yearlyAvailable/);
      expect(src).toMatch(/price_yearly\s*\?\?\s*0/);
    });
    it('savings badge only renders when yearly is available', () => {
      expect(src).toMatch(/yearlyAvailable && savingsPct > 0/);
    });
  });

  describe('SubscribeStepper checkout consistency', () => {
    const src = read('src/components/membership/SubscribeStepper.tsx');
    it('reads price from the selected plan + cycle (no literal)', () => {
      expect(src).toMatch(/billingCycle === 'monthly' \? plan\.price_monthly : plan\.price_yearly/);
    });
    it('keeps VAT inclusive (price / 1.15), never additive', () => {
      expect(src).toMatch(/price\s*\/\s*1\.15/);
      expect(src).not.toMatch(/price\s*\*\s*1\.15/);
    });
    it('does not call payment providers directly', () => {
      expect(src).not.toMatch(/api\.moyasar\.com/);
      expect(src).not.toMatch(/functions\.invoke\(/);
    });
  });

  describe('membership visibility governance still gates the grid', () => {
    const page = read('src/pages/Membership.tsx');
    it('Membership page still consults useMembershipVisibility', () => {
      expect(page).toMatch(/useMembershipVisibility/);
    });
    it('Membership page still uses membershipPathOrNull for CTAs', () => {
      expect(page).toMatch(/membershipPathOrNull/);
    });
  });
});