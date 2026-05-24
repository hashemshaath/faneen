import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');

describe('AUTH-IDENTITY-VERIFY-1: source-level regression checks', () => {
  it('Auth.tsx defaults mode to identity', () => {
    const src = read('src/pages/Auth.tsx');
    expect(src).toMatch(/'identity'\s*\)\s*\|\|\s*'identity'/);
    expect(src).toContain('IdentitySignInForm');
  });

  it('Auth.tsx still supports ?mode=login and ?mode=register', () => {
    const src = read('src/pages/Auth.tsx');
    expect(src).toContain("'login'");
    expect(src).toContain("'register'");
    // invalid mode falls back to 'identity'
    expect(src).toMatch(/\bincludes\(initialMode as never\)/);
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
    // smart input has label, google button, advanced register link
    expect(src).toContain('<Label');
    expect(src).toContain('GoogleAuthButton');
    expect(src).toContain('onAdvancedRegister');
  });

  it('IdentitySignInForm never displays the synthetic @phone.qitaat.local email', () => {
    const src = read('src/components/auth/IdentitySignInForm.tsx');
    expect(src).not.toMatch(/@phone\.qitaat\.local/);
  });

  it('detectKind classifies phone vs email vs unknown', async () => {
    // exercise the same regex used in the component
    const detect = (raw: string): 'phone' | 'email' | 'unknown' => {
      const v = raw.trim();
      if (!v) return 'unknown';
      if (v.includes('@')) return 'email';
      const digits = v.replace(/[\s\-()]/g, '');
      if (/^\+?\d{5,}$/.test(digits)) return 'phone';
      return 'unknown';
    };
    expect(detect('0506315300')).toBe('phone');
    expect(detect('+966506315300')).toBe('phone');
    expect(detect('966506315300')).toBe('phone');
    expect(detect('user@example.com')).toBe('email');
    expect(detect('   ')).toBe('unknown');
    expect(detect('abc')).toBe('unknown');
  });
});