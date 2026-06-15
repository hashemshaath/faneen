/**
 * AUTH SIMPLIFICATION UX — guard tests.
 * Source-level only (no rendering). Enforces the One Account + Post-login
 * Context Selection contract documented in
 * `docs/auth-simplification-context-model-audit.md`.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');
const exists = (p: string) => fs.existsSync(path.resolve(__dirname, '..', '..', p));

describe('AUTH SIMPLIFICATION UX · One Account + Post-Login Context Selection', () => {
  const REGISTER = read('src/components/auth/RegisterForm.tsx');
  const SIGNIN = read('src/components/auth/IdentitySignInForm.tsx');
  const FORGOT = read('src/components/auth/ForgotPasswordForm.tsx');
  const APP = read('src/App.tsx');

  // 1. Register screen does NOT show the legacy 4-card intent picker.
  it('register surface drops the 4-card account-type intent picker', () => {
    expect(REGISTER).not.toMatch(/data-intent="individual"/);
    expect(REGISTER).not.toMatch(/data-intent="create-entity"/);
    expect(REGISTER).not.toMatch(/data-intent="join-invite"/);
    expect(REGISTER).not.toMatch(/data-intent="request-access"/);
    expect(REGISTER).toContain('data-feature="register-single-account"');
  });

  // 2. Register copy explains the single-account model.
  it('register copy says one account + context later', () => {
    expect(REGISTER).toMatch(/حساب واحد يتيح لك/);
    expect(REGISTER).toMatch(/بعد إنشاء الحساب يمكنك اختيار طريقة استخدامك/);
  });

  // 3. Sign-in screen has no account-type chooser.
  it('sign-in screen does not surface account-type selection', () => {
    // No UI-level account-type chooser, no register-style intent cards.
    expect(SIGNIN).not.toMatch(/data-intent=/);
    expect(SIGNIN).not.toMatch(/setAccountType\(/);
    expect(SIGNIN).not.toMatch(/<RegisterForm/);
  });

  // 4. Forgot password is non-enumerating.
  it('forgot password never discloses account existence', () => {
    expect(FORGOT).not.toMatch(/not\s+found|does\s+not\s+exist|غير\s+مسجل/i);
    expect(FORGOT).toMatch(/إذا كان الحساب موجود|If an account exists/);
  });

  // 5. /start page exists and shows 3 context cards only.
  it('post-login /start surface ships with exactly 3 context cards', () => {
    expect(exists('src/pages/Start.tsx')).toBe(true);
    const start = read('src/pages/Start.tsx');
    expect(start).toContain('data-feature="start-context-cards"');
    expect(start).toContain("data-context={c.id}");
    expect(start).toMatch(/id:\s*'individual'/);
    expect(start).toMatch(/id:\s*'create-entity'/);
    expect(start).toMatch(/id:\s*'join-entity'/);
    // No 4th option (legacy request-access)
    expect(start).not.toMatch(/id:\s*'request-access'/);
  });

  // 6. Context choice is not final — user can navigate freely.
  it('/start uses navigation links, not destructive writes', () => {
    const start = read('src/pages/Start.tsx');
    expect(start).not.toMatch(/supabase\.(from|rpc)\(/);
    expect(start).toMatch(/<Link/);
    // "Skip" lets the user bypass without committing
    expect(start).toMatch(/تخطي|Skip/);
  });

  // 7. Context switcher exists in dashboard shell.
  it('dashboard shell still mounts the active-business switcher', () => {
    const layout = read('src/components/dashboard/DashboardLayout.tsx');
    expect(layout).toContain('<ActiveBusinessSwitcher />');
  });

  // 8. /join-as-provider redirect preserved.
  it('preserves the /join-as-provider redirect', () => {
    expect(APP).toMatch(/path="\/join-as-provider".*Navigate to="\/for-providers"/s);
  });

  // 9. /for-providers route still mounted.
  it('/for-providers route is intact', () => {
    expect(APP).toMatch(/path="\/for-providers"/);
  });

  // 10. /onboarding is separate from /auth registration.
  it('/onboarding route is post-auth, separate from /auth', () => {
    expect(APP).toMatch(/path="\/onboarding"/);
    expect(APP).toMatch(/path="\/auth"/);
  });

  // 11. Invite token capture still happens at /auth.
  it('invite token capture still happens in /auth flow', () => {
    const auth = read('src/pages/Auth.tsx');
    expect(auth).toMatch(/qitaat_pending_invite_token/);
  });

  // 12. request-access is NOT a register-time account type.
  it('request-access does not appear as a register-time account type', () => {
    expect(REGISTER).not.toMatch(/request-access/);
  });

  // 13. No DB / RLS / RPC / migration / edge changes in this phase.
  it('this phase does not introduce DB / RLS / RPC / edge code', () => {
    const start = read('src/pages/Start.tsx');
    expect(start).not.toMatch(/supabase\.(from|rpc|functions)/);
    expect(REGISTER).not.toMatch(/supabase\.functions/);
  });

  // 14. No hardcoded hex colors in new files.
  it('phase files contain no hardcoded hex colors', () => {
    const files = ['src/pages/Start.tsx', 'src/components/auth/RegisterForm.tsx'];
    for (const f of files) {
      expect(read(f), `${f} must not contain hex colors`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });

  // 15. No any / @ts-ignore / eslint-disable in new files.
  it('phase files contain no any / @ts-ignore / eslint-disable', () => {
    const files = ['src/pages/Start.tsx', 'src/components/auth/RegisterForm.tsx'];
    for (const f of files) {
      const txt = read(f);
      expect(txt).not.toMatch(/\bas\s+any\b/);
      expect(txt).not.toMatch(/:\s*any\b/);
      expect(txt).not.toMatch(/@ts-ignore/);
      expect(txt).not.toMatch(/@ts-expect-error/);
      expect(txt).not.toMatch(/eslint-disable/);
    }
  });
});
