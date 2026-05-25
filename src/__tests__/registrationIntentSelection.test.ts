/**
 * REGISTRATION-UX-IMPLEMENTATION-P1
 * Source-level guarantees for the Intent Selection screen.
 * No runtime rendering — keeps the test fast and route-free.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ONBOARDING = fs.readFileSync(
  path.resolve(__dirname, '../pages/Onboarding.tsx'),
  'utf8',
);

describe('Registration Intent Selection (P1)', () => {
  it('declares the new "intent" step first in STEP_ORDER', () => {
    expect(ONBOARDING).toMatch(/STEP_ORDER:\s*OnboardingStep\[\]\s*=\s*\[\s*'intent'/);
    expect(ONBOARDING).toContain("useState<OnboardingStep>('intent')");
  });

  it('shows all four intent options in Arabic', () => {
    expect(ONBOARDING).toContain('المتابعة كفرد');
    expect(ONBOARDING).toContain('إنشاء منشأة أو شركة');
    expect(ONBOARDING).toContain('الانضمام بدعوة');
    expect(ONBOARDING).toContain('طلب الانضمام لمنشأة قائمة');
  });

  it('shows all four intent options in English', () => {
    expect(ONBOARDING).toContain('Continue as individual');
    expect(ONBOARDING).toContain('Create a business/entity');
    expect(ONBOARDING).toContain('Join by invitation');
    expect(ONBOARDING).toContain('Request access to an existing entity');
  });

  it('individual path does not create an entity automatically', () => {
    // createBusiness only runs when accountType === 'business'
    expect(ONBOARDING).toMatch(/accountType === 'business' && businessName && username/);
  });

  it('create-entity intent maps to existing business onboarding flow', () => {
    expect(ONBOARDING).toMatch(/id === 'create-entity'[\s\S]*setAccountType\('business'\)/);
  });

  it('join-invite path uses existing /invite/:token route', () => {
    expect(ONBOARDING).toMatch(/navigate\(`\/invite\/\$\{encodeURIComponent\(inviteToken\)\}`\)/);
  });

  it('request-access is marked deferred (no backend write)', () => {
    expect(ONBOARDING).toContain('data-deferred="request-access"');
    expect(ONBOARDING).not.toMatch(/request_access_insert|requestAccess\.create/);
  });

  it('contains no government terminology in registration UI', () => {
    expect(ONBOARDING).not.toMatch(/government/i);
    expect(ONBOARDING).not.toContain('حكومي');
    expect(ONBOARDING).not.toContain('جهة حكومية');
    expect(ONBOARDING).not.toContain('government_site');
  });

  it('account-type fallback uses entity-friendly copy (not provider-only)', () => {
    expect(ONBOARDING).toContain('Business / Entity');
    expect(ONBOARDING).toContain('منشأة / شركة');
  });
});
