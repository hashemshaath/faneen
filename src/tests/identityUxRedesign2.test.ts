/**
 * IDENTITY-UX-REDESIGN-2 — Commercial Conversion Edition
 *
 * Guards the UX redesign without weakening the security baseline
 * locked in by IDENTITY-EXPERIENCE-HARDENING-1.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const exists = (p: string) => existsSync(resolve(ROOT, p));

describe('IDENTITY-UX-REDESIGN-2 — Parts A–O', () => {
  it('audit doc ships with all required parts', () => {
    expect(exists('docs/identity-ux-redesign-2.md')).toBe(true);
    const body = read('docs/identity-ux-redesign-2.md');
    for (const part of [
      'Part A — Login',
      'Part B — Registration',
      'Part C — Onboarding',
      'Part D — Join business',
      'Part E — Invitation',
      'Part F — Forgot',
      'Part G — Account recovery',
      'Part H — Role-aware',
      'Part I — Error system',
      'Part J — Help center',
      'Part K — Trust',
      'Part L — Mobile',
      'Part M — Accessibility',
      'Part N — Safe repairs',
      'Part O — Tests',
    ]) {
      expect(body).toContain(part);
    }
  });

  it('Part J/K — AuthTrustStrip component exists with help + trust anchors', () => {
    expect(exists('src/components/auth/AuthTrustStrip.tsx')).toBe(true);
    const src = read('src/components/auth/AuthTrustStrip.tsx');
    expect(src).toMatch(/256-bit|Privacy protected|تشفير/);
    expect(src).toContain('/contact');
    expect(src).toContain('/help/login-issues');
    expect(src).toContain('/help/creating-a-business');
    expect(src).toContain('/help/joining-a-business');
    expect(src).toContain('/help/invitations');
  });

  it('Part A — sign-in form mounts the trust strip and keeps phone-first', () => {
    const src = read('src/components/auth/IdentitySignInForm.tsx');
    expect(src).toContain("import { AuthTrustStrip }");
    expect(src).toMatch(/<AuthTrustStrip\b[^>]*context=["']login["']/);
    // Phone tab is the default method
    expect(src).toMatch(/useState<Method>\(\s*['"]phone['"]\s*\)/);
  });

  it('Part N — no dialog/popup primitives reintroduced in identity surfaces', () => {
    const files = [
      'src/components/auth/IdentitySignInForm.tsx',
      'src/components/auth/AuthTrustStrip.tsx',
      'src/components/auth/ForgotPasswordForm.tsx',
      'src/components/auth/AuthLayout.tsx',
    ];
    for (const f of files) {
      if (!exists(f)) continue;
      const body = read(f);
      expect(body, `${f} must not import Dialog/AlertDialog`).not.toMatch(
        /from\s+['"]@\/components\/ui\/(dialog|alert-dialog|sheet|drawer)['"]/,
      );
    }
  });

  it('Part F — identity routes preserved in App.tsx', () => {
    const app = read('src/App.tsx');
    for (const route of ['"/auth"', '"/onboarding"', '"/reset-password"', '"/invite/:token"']) {
      expect(app).toContain(`path=${route}`);
    }
  });

  it('Part H — useRoleRedirect matrix unchanged', () => {
    const src = read('src/hooks/useRoleRedirect.ts');
    expect(src).toMatch(/isSuperAdmin[\s\S]{0,80}\/admin\/activity-log/);
    expect(src).toMatch(/is_onboarded[\s\S]{0,80}\/onboarding/);
    expect(src).toMatch(/isProvider[\s\S]{0,40}\/dashboard/);
  });

  it('Part D — no account-existence leakage strings introduced in trust strip / sign-in', () => {
    const surfaces = [
      'src/components/auth/AuthTrustStrip.tsx',
      'src/components/auth/IdentitySignInForm.tsx',
    ];
    const leak = /(account (does not|doesn't) exist|no account found|email not registered|الحساب غير موجود|البريد غير مسجل)/i;
    for (const f of surfaces) {
      const body = read(f);
      expect(leak.test(body), `${f} must not leak account existence`).toBe(false);
    }
  });

  it('Part L — sign-in form keeps mobile-friendly inputs (autocomplete + inputMode)', () => {
    const src = read('src/components/auth/IdentitySignInForm.tsx');
    expect(src).toContain('autoComplete="email"');
    expect(src).toContain('autoComplete="current-password"');
    expect(src).toContain('inputMode="email"');
  });

  it('Part N — Auth.tsx still routes through IdentitySignInForm (no legacy LoginForm)', () => {
    const src = read('src/pages/Auth.tsx');
    expect(src).toContain('IdentitySignInForm');
    expect(src).not.toMatch(/from\s+['"]@\/components\/auth\/LoginForm['"]/);
  });
});