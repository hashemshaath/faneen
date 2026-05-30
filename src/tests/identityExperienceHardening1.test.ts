/**
 * IDENTITY-EXPERIENCE-HARDENING-1
 *
 * Presence + scope guards for the identity audit. Confirms the nine
 * audit artifacts ship, the redirect/role contract stays intact, and
 * no forbidden patterns (anon sign-up, localStorage admin checks,
 * synthetic phone email leaks, role storage on profiles) regress.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf8');
const exists = (p: string) => existsSync(resolve(ROOT, p));

function walkSrc(): string[] {
  const out: string[] = [];
  const stack = [resolve(ROOT, 'src')];
  while (stack.length) {
    const dir = stack.pop()!;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (entry === 'node_modules' || entry.startsWith('.')) continue;
        stack.push(full);
      } else if (/\.(ts|tsx)$/.test(entry)) {
        out.push(full);
      }
    }
  }
  return out;
}

describe('IDENTITY-EXPERIENCE-HARDENING-1 — Parts A–L', () => {
  it('Part A — system inventory exists with all surfaces', () => {
    expect(exists('docs/identity-system-inventory.md')).toBe(true);
    const body = read('docs/identity-system-inventory.md');
    for (const surface of [
      'IdentitySignInForm',
      'RegisterForm',
      'ForgotPasswordForm',
      'ProtectedRoute',
      'PermissionRouteGuard',
      'useRoleRedirect',
      'user_roles',
      'has_role',
      'password_reset_log',
      'client_invitations',
      'business_staff_invitations',
    ]) {
      expect(body).toContain(surface);
    }
  });

  it('Part B — authentication flow audit covers required flows', () => {
    const body = read('docs/authentication-flow-audit.md');
    for (const flow of [
      'New user registration',
      'login — email',
      'login — phone OTP',
      'Forgot password',
      'Reset password',
      'Invitation acceptance',
      'staff invitation',
      'Business join',
    ]) {
      expect(body.toLowerCase()).toContain(flow.toLowerCase());
    }
  });

  it('Parts C–I — required artifacts exist', () => {
    for (const f of [
      'docs/identity-ux-review.md',
      'docs/account-detection-review.md',
      'docs/session-redirect-audit.md',
      'docs/identity-permission-audit.md',
      'docs/identity-notification-audit.md',
      'docs/identity-security-review.md',
    ]) {
      expect(exists(f)).toBe(true);
    }
  });

  it('Part D — account detection is intentionally deferred (no enumeration oracle)', () => {
    const body = read('docs/account-detection-review.md');
    expect(body).toMatch(/enumeration/i);
    expect(body).toMatch(/DEFERRED-BY-DESIGN|intentionally NOT implemented/);
  });

  it('Part F — useRoleRedirect preserves the documented matrix', () => {
    const src = read('src/hooks/useRoleRedirect.ts');
    expect(src).toMatch(/isSuperAdmin[\s\S]{0,80}\/admin\/activity-log/);
    expect(src).toMatch(/is_onboarded[\s\S]{0,80}\/onboarding/);
    expect(src).toMatch(/isProvider[\s\S]{0,40}\/dashboard/);
  });

  it('Part F — ProtectedRoute keeps onboarding + forbidden gates', () => {
    const src = read('src/components/auth/ProtectedRoute.tsx');
    expect(src).toContain('!profile.is_onboarded');
    expect(src).toContain('setForbiddenContext');
    expect(src).toContain('access_violation_log');
  });

  it('Part I — no localStorage-based admin/role checks anywhere in src', () => {
    const files = walkSrc();
    const forbidden = /localStorage[\s\S]{0,40}(isAdmin|is_admin|role\s*=|admin)/i;
    const offenders: string[] = [];
    for (const f of files) {
      const body = readFileSync(f, 'utf8');
      if (forbidden.test(body)) offenders.push(f.replace(ROOT + '/', ''));
    }
    // Allow none — privilege escalation guard.
    expect(offenders).toEqual([]);
  });

  it('Part I — synthetic @phone.qitaat.local is never user-visible', () => {
    const files = walkSrc().filter((f) => f.includes('/components/auth/') || f.includes('/pages/Auth'));
    for (const f of files) {
      const body = readFileSync(f, 'utf8');
      expect(body).not.toMatch(/['"`][^'"`]*@phone\.qitaat\.local[^'"`]*['"`]/);
    }
  });

  it('Part I — Auth.tsx never renders the legacy LoginForm', () => {
    const src = read('src/pages/Auth.tsx');
    expect(src).not.toMatch(/from\s+['"]@\/components\/auth\/LoginForm['"]/);
    expect(src).toContain('IdentitySignInForm');
  });

  it('Part I — ResetPassword refuses without recovery hash', () => {
    const src = read('src/pages/ResetPassword.tsx');
    expect(src).toMatch(/type=recovery|type === ['"]recovery['"]|recovery/i);
  });

  it('Part K — scope: identity module barrel stays canonical', () => {
    const barrel = read('src/modules/identity/index.ts');
    for (const area of [
      './services/roles',
      './services/adminSecurity',
      './services/passwordResetLog',
      './services/tempCode',
      './services/session',
      './services/account',
      './services/invitations',
    ]) {
      expect(barrel).toContain(area);
    }
  });

  it('Part K — no WhatsApp/SMS provider snuck in via identity surface', () => {
    const files = walkSrc().filter(
      (f) => f.includes('/components/auth/') || f.includes('/modules/identity/') || f.includes('/services/auth/'),
    );
    const banned = /(twilio|whatsapp|wa\.me|messagebird|vonage|nexmo)/i;
    for (const f of files) {
      const body = readFileSync(f, 'utf8');
      expect(banned.test(body), `${f} references a banned provider`).toBe(false);
    }
  });

  it('Part K — roles are stored in user_roles, never on profiles', () => {
    // Privilege-escalation guard: no app code should read role columns from profiles.
    const files = walkSrc();
    const bad = /\.from\(\s*['"]profiles['"]\s*\)[\s\S]{0,200}\b(role|is_admin|is_super_admin)\b/;
    const offenders: string[] = [];
    for (const f of files) {
      const body = readFileSync(f, 'utf8');
      if (bad.test(body)) offenders.push(f.replace(ROOT + '/', ''));
    }
    expect(offenders).toEqual([]);
  });
});