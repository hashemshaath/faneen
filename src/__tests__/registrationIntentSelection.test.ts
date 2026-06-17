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
// Intent selection moved out of Onboarding.tsx and now lives on /start.
const START = fs.readFileSync(
  path.resolve(__dirname, '../pages/Start.tsx'),
  'utf8',
);

describe('Registration Intent Selection (P1)', () => {
  it('declares the "intent" step first in STEP_ORDER', () => {
    expect(ONBOARDING).toMatch(/STEP_ORDER:\s*OnboardingStep\[\]\s*=\s*\[\s*'intent'/);
    expect(ONBOARDING).toContain("useState<OnboardingStep>('intent')");
  });

  it('shows the remaining intent options in Arabic (join-by-link only)', () => {
    expect(START).toContain('المتابعة كفرد');
    expect(START).toMatch(/إنشاء منشأة|إنشاء منشأة أو شركة/);
    // Join-by-invitation / request-access cards removed — invite link only.
    expect(START).not.toContain('الانضمام بدعوة');
    expect(START).not.toMatch(/id:\s*'request-access'/);
  });

  it('shows the remaining intent options in English (join-by-link only)', () => {
    expect(START).toContain('Continue as individual');
    expect(START).toMatch(/Create a business/);
    expect(START).not.toContain('Join by invitation');
    expect(START).not.toMatch(/data-context="join-invite"/);
    expect(START).not.toMatch(/data-context="request-access"/);
  });

  it('individual path does not create an entity automatically', () => {
    // createBusiness only runs when accountType === 'business'
    expect(ONBOARDING).toMatch(/accountType === 'business' && businessName && username/);
  });

  it('create-entity intent maps to existing business onboarding flow', () => {
    // create-entity card on /start hands off to the basic registration page.
    expect(START).toMatch(/id:\s*'create-entity'[\s\S]*?to:\s*'\/register-entity'/);
  });

  it('no in-form invitation-token paste box (link-only join)', () => {
    expect(ONBOARDING).not.toMatch(/inviteToken/);
    expect(ONBOARDING).not.toMatch(/Paste invitation token/);
  });

  it('request-access UI is fully removed from onboarding intent screen', () => {
    expect(ONBOARDING).not.toContain('data-feature="request-access"');
    expect(ONBOARDING).not.toContain('createEntityAccessRequest');
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
