/**
 * HARDENING-1A — Auth & Onboarding stability regression checks.
 *
 * Source-level invariants that protect the key safety/UX properties
 * established by earlier phases (AUTH-IDENTITY-VERIFY-1,
 * AUTH-EMAIL-PHONE-VERIFY-2, REGISTRATION-UX-IMPLEMENTATION-P1, etc.).
 * Pure file-read assertions — no rendering, no network.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  isSyntheticPhoneEmail,
  getDisplayEmail,
  getEmailDeliveryAddress,
  SYNTHETIC_PHONE_EMAIL_DOMAIN,
} from '@/lib/auth-email';

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, '..', '..', rel), 'utf8');

describe('HARDENING-1A: auth entry surface', () => {
  const identity = read('src/components/auth/IdentitySignInForm.tsx');

  it('keeps both phone and email sign-in methods alongside Google', () => {
    expect(identity).toContain('PhoneInput');
    expect(identity).toContain('signInWithEmail');
    expect(identity).toContain('sendLoginOtp');
    expect(identity).toContain('GoogleAuthButton');
  });

  it('preserves the brute-force lockout and never weakens it', () => {
    expect(identity).toContain('useLoginLockout');
    expect(identity).toMatch(/lockout\.recordFailure\(\)/);
    expect(identity).toMatch(/lockout\.recordSuccess\(\)/);
    // Sign-in button must stay disabled while locked.
    expect(identity).toMatch(/disabled=\{loading \|\| lockout\.isLocked\}/);
  });

  it('never logs OTP codes, passwords, or the demo OTP to the console', () => {
    expect(identity).not.toMatch(/console\.(log|info|warn|error)\s*\([^)]*(otp|password|demo)/i);
    const otpFlow = read('src/services/auth/useOtpFlow.ts');
    expect(otpFlow).not.toMatch(/console\.(log|info|warn|error)\s*\([^)]*(otp|code|demo)/i);
  });

  it('routes auth-help links through onForgotPassword / onAdvancedRegister, never to forbidden tables', () => {
    expect(identity).toContain('AuthErrorHelpLinks');
    expect(identity).toContain("action === 'forgot-password'");
    expect(identity).toContain("action === 'register'");
    // Guard: no direct supabase.from('profiles' | 'user_roles' | 'auth.users') in the sign-in form.
    expect(identity).not.toMatch(/supabase\.from\(['"](profiles|user_roles)['"]\)/);
  });
});

describe('HARDENING-1A: synthetic phone email masking', () => {
  it('isSyntheticPhoneEmail flags the internal phone-login domain', () => {
    expect(isSyntheticPhoneEmail(`966500000000@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`)).toBe(true);
    expect(isSyntheticPhoneEmail('user@example.com')).toBe(false);
    expect(isSyntheticPhoneEmail(null)).toBe(false);
    expect(isSyntheticPhoneEmail(undefined)).toBe(false);
  });

  it('getDisplayEmail prefers profile email and never surfaces synthetic addresses', () => {
    expect(getDisplayEmail({
      authEmail: `966500000000@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`,
      profileEmail: 'official@example.com',
    })).toBe('official@example.com');

    expect(getDisplayEmail({
      authEmail: `966500000000@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`,
      profileEmail: null,
    })).toBeNull();

    expect(getDisplayEmail({
      authEmail: 'real@example.com',
      profileEmail: null,
    })).toBe('real@example.com');
  });

  it('getEmailDeliveryAddress refuses synthetic addresses (no transactional delivery)', () => {
    expect(getEmailDeliveryAddress({
      authEmail: `966500000000@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`,
      profileEmail: null,
    })).toBeNull();
    expect(getEmailDeliveryAddress({
      authEmail: `966500000000@${SYNTHETIC_PHONE_EMAIL_DOMAIN}`,
      profileEmail: 'official@example.com',
    })).toBe('official@example.com');
  });
});

describe('HARDENING-1A: onboarding gating', () => {
  const onboarding = read('src/pages/Onboarding.tsx');

  it('uses is_onboarded as the single gate (no account_type shortcut)', () => {
    expect(onboarding).toMatch(/profile\?\.is_onboarded\s*&&[^\n]*navigate\(getTargetRoute\(\)\)/);
    expect(onboarding).not.toMatch(/account_type\s*===\s*['"]individual['"][^\n]*navigate\(['"]\/dashboard/);
  });

  it('persists is_onboarded:true only via completeOnboarding (single write point)', () => {
    const hits = onboarding.match(/is_onboarded:\s*true/g) || [];
    expect(hits.length).toBe(1);
  });

  it('phone-OTP users without official email can still complete onboarding', () => {
    // completeOnboarding never requires user.email; phone is sourced from local state.
    expect(onboarding).toMatch(/phone:\s*`\$\{countryCode\}\$\{phone\}`/);
    // The business creation only requires user.id + business fields, not an email.
    expect(onboarding).toMatch(/authService\.createBusiness\(user!\.id, businessName, username,/);
  });

  it('individual draft never resumes on a business-only step', () => {
    expect(onboarding).toContain(
      "draftStep === 'business-details' || draftStep === 'business-sectors'",
    );
    expect(onboarding).toMatch(/effectiveAccountType === 'individual' && isBusinessOnlyStep/);
  });

  it('never renders the synthetic phone email domain anywhere in the wizard', () => {
    expect(onboarding).not.toContain(SYNTHETIC_PHONE_EMAIL_DOMAIN);
  });
});
