import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');
const exists = (p: string) => fs.existsSync(path.resolve(__dirname, '..', '..', p));

describe('AUTH-14C · Verification + Password Recovery UX guard', () => {
  // 1. /auth/verified renders a clear success surface
  it('AuthVerified surfaces a clear success state', () => {
    expect(exists('src/pages/AuthVerified.tsx')).toBe(true);
    const src = read('src/pages/AuthVerified.tsx');
    expect(src).toMatch(/تم تفعيل بريدك بنجاح/);
    expect(src).toMatch(/Your email has been verified/);
  });

  // 2. /auth/verified renders a clear failure / expired-link state
  it('AuthVerified surfaces a clear failure / expired-link state', () => {
    const src = read('src/pages/AuthVerified.tsx');
    expect(src).toMatch(/رابط التفعيل غير صالح أو انتهت مدته/);
    expect(src).toMatch(/invalid or expired/i);
    // Failure detection from query OR hash
    expect(src).toMatch(/error_description/);
    expect(src).toMatch(/window\.location\.hash/);
  });

  // 3. Success state offers a CTA to /dashboard
  it('AuthVerified success state has a /dashboard CTA', () => {
    const src = read('src/pages/AuthVerified.tsx');
    expect(src).toMatch(/to=\{user \? '\/dashboard' : '\/auth'\}/);
  });

  // 4. Failure / signed-out state offers a CTA to /auth (login)
  it('AuthVerified failure state routes back to /auth', () => {
    const src = read('src/pages/AuthVerified.tsx');
    // both the failure branch and the secondary "sign in" CTA target /auth
    const occurrences = src.match(/to="\/auth"/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(2);
  });

  // 5. Reset-password (forgot) copy does NOT disclose whether the email exists
  it('ForgotPasswordForm uses privacy-safe "if an account exists" copy', () => {
    const src = read('src/components/auth/ForgotPasswordForm.tsx');
    expect(src).toMatch(/إذا كان الحساب موجوداً/);
    expect(src).toMatch(/If an account exists/);
    // and never the leaking variants
    expect(src).not.toMatch(/البريد غير موجود/);
    expect(src).not.toMatch(/no account found/i);
    expect(src).not.toMatch(/email not found/i);
    expect(src).not.toMatch(/user not found/i);
  });

  // 6. Update-password page (ResetPassword) has clear copy + expired / invalid handling
  it('ResetPassword page handles checking / valid / expired / invalid states with clear copy', () => {
    const src = read('src/pages/ResetPassword.tsx');
    expect(src).toMatch(/linkStatus/);
    expect(src).toMatch(/'checking'\s*\|\s*'valid'\s*\|\s*'expired'\s*\|\s*'invalid'/);
    expect(src).toMatch(/انتهت صلاحية الرابط|Link Expired/);
    expect(src).toMatch(/رابط غير صالح|Invalid Link/);
    // password mismatch + weakness messages localised
    expect(src).toMatch(/كلمة المرور غير متطابقة|Passwords do not match/);
    expect(src).toMatch(/ضعيفة|too weak/);
  });

  // 7. No screen-level copy reveals "email not found"
  it('no auth surface leaks email-not-found wording', () => {
    const files = [
      'src/pages/Auth.tsx',
      'src/pages/AuthVerified.tsx',
      'src/pages/ResetPassword.tsx',
      'src/components/auth/ForgotPasswordForm.tsx',
      'src/components/auth/IdentitySignInForm.tsx',
      'src/components/auth/RegisterForm.tsx',
      'src/components/dashboard/UnverifiedEmailBanner.tsx',
    ];
    for (const f of files) {
      if (!exists(f)) continue;
      const txt = read(f);
      expect(txt, `${f} must not leak account existence`).not.toMatch(/البريد غير موجود/);
      expect(txt, `${f} must not leak account existence`).not.toMatch(/الحساب غير موجود/);
      expect(txt, `${f} must not leak account existence`).not.toMatch(/email\s+not\s+found/i);
      expect(txt, `${f} must not leak account existence`).not.toMatch(/user\s+not\s+found/i);
    }
  });

  // 8. Resend-verification UX does not invoke a new edge/RPC pathway
  it('UnverifiedEmailBanner does not call a new resend API/edge/RPC', () => {
    const src = read('src/components/dashboard/UnverifiedEmailBanner.tsx');
    expect(src).not.toMatch(/supabase\./);
    expect(src).not.toMatch(/functions\.invoke/);
    expect(src).not.toMatch(/\.rpc\(/);
    expect(src).not.toMatch(/fetch\(/);
    expect(src).not.toMatch(/resend/i);
  });

  // 9. Auth core surfaces unchanged in this phase — Auth.tsx still mounts
  //    IdentitySignInForm and normalises to identity mode
  it('Auth.tsx core session/callback wiring is untouched', () => {
    const src = read('src/pages/Auth.tsx');
    expect(src).toContain('IdentitySignInForm');
    expect(src).toMatch(/return 'identity'/);
    expect(src).toContain('redirectByRole');
  });

  // 10. Password policy (min length, strength gate) untouched
  it('Password policy still enforces ≥8 chars and strength ≥2', () => {
    const src = read('src/pages/ResetPassword.tsx');
    expect(src).toMatch(/password\.length\s*<\s*8/);
    expect(src).toMatch(/strength\.score\s*<\s*2/);
  });

  // 11. No DB / RLS / RPC / migration / edge touched by 14C additions
  it('phase-14C additions do not touch DB/RLS/RPC/migrations/edge', () => {
    // No new migration files reference 14C
    const migrationsDir = path.resolve(__dirname, '..', '..', 'supabase', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir);
      for (const f of files) {
        const txt = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
        expect(txt).not.toMatch(/phase[\s_-]?14c/i);
      }
    }
    // No new edge function dirs reference 14C
    const edgeDir = path.resolve(__dirname, '..', '..', 'supabase', 'functions');
    if (fs.existsSync(edgeDir)) {
      for (const entry of fs.readdirSync(edgeDir)) {
        expect(entry).not.toMatch(/phase-14c/i);
      }
    }
  });

  // 12. No hardcoded hex colors in phase-14B/14C added files
  it('14B/14C added surfaces use design tokens, not hex colors', () => {
    const files = [
      'src/pages/AuthVerified.tsx',
      'src/components/dashboard/UnverifiedEmailBanner.tsx',
      'src/components/dashboard/FreeLaunchBadge.tsx',
    ];
    for (const f of files) {
      const txt = read(f);
      expect(txt, `${f} must not contain hex colors`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  // 13. No any/ts-ignore/eslint-disable in 14C-touched files
  it('14C-touched surfaces contain no any / @ts-ignore / eslint-disable', () => {
    const files = [
      'src/pages/AuthVerified.tsx',
      'src/components/dashboard/UnverifiedEmailBanner.tsx',
      'src/components/dashboard/FreeLaunchBadge.tsx',
    ];
    for (const f of files) {
      const txt = read(f);
      expect(txt).not.toMatch(/\bas\s+any\b/);
      expect(txt).not.toMatch(/:\s*any\b/);
      expect(txt).not.toMatch(/@ts-ignore/);
      expect(txt).not.toMatch(/@ts-expect-error/);
      expect(txt).not.toMatch(/eslint-disable/);
    }
  });

  // 14. No Dialog/Popover/Modal primitives in 14C-touched surfaces
  it('14C-touched surfaces do not introduce popups/dialogs', () => {
    const files = [
      'src/pages/AuthVerified.tsx',
      'src/components/dashboard/UnverifiedEmailBanner.tsx',
      'src/components/dashboard/FreeLaunchBadge.tsx',
    ];
    for (const f of files) {
      const txt = read(f);
      expect(txt).not.toMatch(/from\s+['"]@\/components\/ui\/(dialog|alert-dialog|popover|sheet)['"]/);
    }
  });
});