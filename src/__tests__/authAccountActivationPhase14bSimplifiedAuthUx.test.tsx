import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');
const exists = (p: string) => fs.existsSync(path.resolve(__dirname, '..', '..', p));

describe('AUTH-14B · Simplified Auth UX + duplication cleanup guard', () => {
  // 1. /auth is still the canonical entry point
  it('keeps /auth as the canonical entry point in App.tsx', () => {
    const src = read('src/App.tsx');
    expect(src).toMatch(/path="\/auth"\s+element=\{<Auth\s*\/>\}/);
  });

  // 2. No standalone /login or /register routes
  it('does not introduce standalone /login or /register routes', () => {
    const src = read('src/App.tsx');
    expect(src).not.toMatch(/path="\/login"/);
    expect(src).not.toMatch(/path="\/register"/);
  });

  // 3+4. Register screen surfaces explicit account-type intents and does
  //      not collapse onboarding into the register form.
  it('register form keeps explicit account-type intents and is separate from onboarding', () => {
    const src = read('src/components/auth/RegisterForm.tsx');
    expect(src).toMatch(/intent|account_type|accountType/);
    expect(src).not.toMatch(/from '@\/pages\/Onboarding'/);
  });

  // 5. /for-providers exists and points to provider sign-up flow
  it('/for-providers route is mounted', () => {
    const src = read('src/App.tsx');
    expect(src).toMatch(/path="\/for-providers"/);
  });

  // 6. /join-as-provider redirect is preserved
  it('preserves the /join-as-provider redirect', () => {
    const src = read('src/App.tsx');
    expect(src).toMatch(/path="\/join-as-provider".*Navigate to="\/for-providers"/s);
  });

  // 7. Reset-password copy does not disclose whether the email exists
  it('forgot-password form does not disclose account existence', () => {
    const src = read('src/components/auth/ForgotPasswordForm.tsx');
    expect(src).not.toMatch(/not\s+found|does\s+not\s+exist|غير\s+مسجل/i);
  });

  // 8. /auth/verified exists and is routed
  it('mounts /auth/verified surface', () => {
    expect(exists('src/pages/AuthVerified.tsx')).toBe(true);
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/auth\/verified"/);
  });

  // 9. Dashboard renders the unverified-email banner component
  it('dashboard overview mounts UnverifiedEmailBanner', () => {
    const src = read('src/pages/dashboard/DashboardOverview.tsx');
    expect(src).toContain('UnverifiedEmailBanner');
    const banner = read('src/components/dashboard/UnverifiedEmailBanner.tsx');
    // Email must be masked, never shown raw
    expect(banner).toMatch(/maskEmail/);
    // Synthetic phone emails are excluded
    expect(banner).toMatch(/isSyntheticPhoneEmail/);
  });

  // 10. Provider dashboard renders the FreeLaunchBadge
  it('provider dashboard shows the free-launch badge', () => {
    const src = read('src/pages/dashboard/overview/ProviderDashboardView.tsx');
    expect(src).toContain('FreeLaunchBadge');
    expect(exists('src/components/dashboard/FreeLaunchBadge.tsx')).toBe(true);
  });

  // 11+14. Membership grant logic untouched: no migrations from this phase
  //        and ensure_provider_subscription is not referenced from UI.
  it('does not touch ensure_provider_subscription from UI code', () => {
    // Recursive scan of src/ for any direct call to the RPC
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          // Skip this guard test itself — it references the RPC name as a literal.
          if (full.endsWith('authAccountActivationPhase14bSimplifiedAuthUx.test.tsx')) continue;
          const txt = fs.readFileSync(full, 'utf8');
          if (txt.includes('ensure_provider_subscription')) offenders.push(full);
        }
      }
    };
    walk(path.resolve(__dirname, '..'));
    expect(offenders).toEqual([]);
  });

  // 13. Auth.tsx session/callback core untouched — identity default preserved
  it('Auth.tsx still defaults to identity mode and uses IdentitySignInForm', () => {
    const src = read('src/pages/Auth.tsx');
    expect(src).toContain('IdentitySignInForm');
    expect(src).toMatch(/return 'identity'/);
  });

  // 15. Phase 14B files contain no hardcoded hex colors
  it('phase-14B additions use design tokens, never hardcoded hex', () => {
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

  // 16. No any/ts-ignore/eslint-disable in new files
  it('phase-14B additions contain no any / @ts-ignore / eslint-disable', () => {
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

  // 17. No popups/dialogs introduced by phase-14B surfaces
  it('phase-14B additions do not use Dialog/Popover/Modal primitives', () => {
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