import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');

describe('AUTH-IDENTITY-VERIFY-1: source-level regression checks', () => {
  it('Auth.tsx defaults mode to identity', () => {
    const src = read('src/pages/Auth.tsx');
    // normalizeMode returns 'identity' as the default fallback
    expect(src).toMatch(/return 'identity'/);
    expect(src).toContain('IdentitySignInForm');
  });

  it('Auth.tsx normalizes legacy ?mode=login to identity and supports ?mode=register', () => {
    const src = read('src/pages/Auth.tsx');
    // legacy login aliases collapse into the unified identity flow
    expect(src).toMatch(/case 'login':/);
    expect(src).toMatch(/case 'signup':\s*\n\s*return 'register'/);
    // the old password-only LoginForm must not be imported anymore
    expect(src).not.toMatch(/from '@\/components\/auth\/LoginForm'/);
  });

  it('AuthLayout uses AuthShowcase (no auth-slide raster imports)', () => {
    const src = read('src/components/auth/AuthLayout.tsx');
    expect(src).toContain('AuthShowcase');
    expect(src).not.toMatch(/auth-slide|authSlide/);
  });

  it('AuthShowcase has no missing image imports', () => {
    const src = read('src/components/auth/AuthShowcase.tsx');
    expect(src).not.toMatch(/from ['"][^'"]*\.(png|jpe?g|webp|gif)['"]/);
    // brand industrial visuals via SVG
    expect(src).toContain('<svg');
  });

  it('index.css ships auth-rise + stripe keyframes with reduced-motion guard', () => {
    const css = read('src/index.css');
    expect(css).toMatch(/@keyframes auth-rise/);
    expect(css).toMatch(/@keyframes stripe/);
    // both keyframes must be neutralised by reduced motion
    const rmBlock = css.split('@media (prefers-reduced-motion: reduce)').slice(1).join('\n');
    expect(rmBlock).toMatch(/auth-rise|animation:\s*none/);
  });

  it('Onboarding has no account_type=individual shortcut to /dashboard', () => {
    const src = read('src/pages/Onboarding.tsx');
    // The gate now uses is_onboarded only.
    expect(src).toMatch(/profile\?\.is_onboarded\s*&&/);
    // Guard against the legacy shortcut returning if regressed.
    expect(src).not.toMatch(/account_type\s*===\s*['"]individual['"][^\n]*navigate\(['"]\/dashboard/);
  });

  it('IdentitySignInForm preserves login-lockout, remember-me, error help links, analytics', () => {
    const src = read('src/components/auth/IdentitySignInForm.tsx');
    expect(src).toContain('useLoginLockout');
    expect(src).toContain('rememberMe');
    expect(src).toContain('AuthErrorHelpLinks');
    expect(src).toContain('trackLoginSuccess');
    expect(src).toContain('trackLoginFailed');
    // labels, google button, advanced register link
    expect(src).toContain('<Label');
    expect(src).toContain('GoogleAuthButton');
    expect(src).toContain('onAdvancedRegister');
  });

  it('IdentitySignInForm never displays the synthetic @phone.qitaat.local email', () => {
    const src = read('src/components/auth/IdentitySignInForm.tsx');
    expect(src).not.toMatch(/@phone\.qitaat\.local/);
  });

  it('IdentitySignInForm exposes a phone/email method switcher with tablist semantics', () => {
    const src = read('src/components/auth/IdentitySignInForm.tsx');
    expect(src).toMatch(/role="tablist"/);
    // both tabs present
    const tabs = src.match(/role="tab"/g) || [];
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    // both paths use their respective service calls
    expect(src).toContain('PhoneInput');
    expect(src).toContain('signInWithEmail');
    expect(src).toContain('sendLoginOtp');
  });
});