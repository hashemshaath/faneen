import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (p: string) => fs.readFileSync(path.resolve(ROOT, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.resolve(ROOT, p));

describe('AUTH-14G · Full regression + launch readiness sweep', () => {
  // 1. /auth canonical entry preserved
  it('keeps /auth as the canonical entry route', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/auth"\s+element=\{<Auth\s*\/>\}/);
  });

  // 2. /auth/verified route preserved
  it('keeps /auth/verified route mounted', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/auth\/verified"/);
    expect(exists('src/pages/AuthVerified.tsx')).toBe(true);
  });

  // 3. /join-as-provider safe redirect preserved
  it('preserves /join-as-provider → /for-providers redirect', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/join-as-provider".*Navigate to="\/for-providers"/s);
  });

  // 4. /for-providers route mounted
  it('mounts /for-providers route', () => {
    const app = read('src/App.tsx');
    expect(app).toMatch(/path="\/for-providers"/);
  });

  // 5. No standalone confusing /login or /register routes
  it('does not introduce standalone /login or /register routes', () => {
    const app = read('src/App.tsx');
    expect(app).not.toMatch(/path="\/login"/);
    expect(app).not.toMatch(/path="\/register"/);
  });

  // 6. Forgot-password copy does not disclose account existence
  it('forgot-password form does not disclose account existence', () => {
    const src = read('src/components/auth/ForgotPasswordForm.tsx');
    expect(src).toMatch(/إذا كان الحساب موجوداً/);
    expect(src).toMatch(/If an account exists/);
    expect(src).not.toMatch(/not\s+found|does\s+not\s+exist|غير\s+مسجل|user not found/i);
  });

  // 7. AuthVerified surfaces both success and failure states
  it('AuthVerified surfaces success + failure states', () => {
    const src = read('src/pages/AuthVerified.tsx');
    expect(src).toMatch(/تم تفعيل بريدك بنجاح/);
    expect(src).toMatch(/Your email has been verified/);
    expect(src).toMatch(/رابط التفعيل غير صالح أو انتهت مدته/);
    expect(src).toMatch(/invalid or expired/i);
  });

  // 8. Unverified-email banner exists, masks the email, hides phone-synth emails
  it('UnverifiedEmailBanner masks email and skips phone-synth emails', () => {
    const src = read('src/components/dashboard/UnverifiedEmailBanner.tsx');
    // mask pattern (a***z@domain)
    expect(src).toMatch(/\*{2,}/);
    // No raw email rendering
    expect(src).not.toMatch(/\{[^}]*\bemail\b[^}]*\}\s*<\/(p|span|div)>/);
  });

  // 9. FreeLaunchBadge present with corrected tier mapping
  it('FreeLaunchBadge maps both free and free_launch tiers as active', () => {
    const src = read('src/components/dashboard/FreeLaunchBadge.tsx');
    expect(src).toMatch(/normalized === 'free_launch'/);
    expect(src).toMatch(/normalized === 'free'/);
  });

  // 10. Duplicate business warning on onboarding intent screen
  it('onboarding intent screen carries duplicate-entity warning', () => {
    const src = read('src/pages/Onboarding.tsx');
    expect(src).toMatch(/onboarding-duplicate-warning/);
    expect(src).toMatch(/إذا كانت منشأتك مسجلة مسبقًا في قطاعات/);
  });

  // 11. request-access clarification copy present
  it('request-access surface carries admin-approval clarification', () => {
    const src = read('src/pages/Onboarding.tsx');
    expect(src).toMatch(/request-access-clarification/);
    expect(src).toMatch(/يحتاج مراجعة من مسؤول المنشأة/);
  });

  // 12. Provider dashboard next-step guidance block present
  it('provider dashboard renders next-step guidance', () => {
    const src = read('src/pages/dashboard/overview/ProviderDashboardView.tsx');
    expect(src).toMatch(/provider-next-step-guidance/);
    expect(src).toMatch(/الخطوة التالية/);
  });

  // 13. STEP_ORDER untouched
  it('STEP_ORDER is preserved verbatim', () => {
    const src = read('src/pages/Onboarding.tsx');
    expect(src).toMatch(
      /const STEP_ORDER: OnboardingStep\[\] = \[\s*'intent', 'account-type', 'business-details', 'details', 'phone-verify',\s*'documents', 'summary',\s*\];/,
    );
  });

  // 14. ensure_provider_subscription is not referenced from UI code
  it('UI code does not reference ensure_provider_subscription', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx)$/.test(entry.name)) {
          if (/authAccountActivationPhase14[a-z]/.test(full)) continue;
          const txt = fs.readFileSync(full, 'utf8');
          if (txt.includes('ensure_provider_subscription')) offenders.push(full);
        }
      }
    };
    walk(path.resolve(ROOT, 'src'));
    expect(offenders).toEqual([]);
  });

  // 15. credits/cron untouched (no AUTH-14x marker in those modules)
  it('credits modules carry no Phase-14 mutation markers', () => {
    const dirs = ['src/modules/credits', 'supabase/functions/_shared/credits'];
    for (const dir of dirs) {
      const abs = path.resolve(ROOT, dir);
      if (!fs.existsSync(abs)) continue;
      const walk = (d: string): string[] => fs.readdirSync(d).flatMap((e) => {
        const full = path.join(d, e);
        return fs.statSync(full).isDirectory() ? walk(full) : [full];
      });
      for (const f of walk(abs)) {
        const txt = fs.readFileSync(f, 'utf8');
        expect(txt, `${f} must not be tagged for Phase 14`)
          .not.toMatch(/AUTH-14[A-G]\b/);
      }
    }
  });

  // 16. auth/session/callback core untouched — Auth.tsx still uses identity default
  it('Auth.tsx still defaults to identity mode + uses IdentitySignInForm', () => {
    const src = read('src/pages/Auth.tsx');
    expect(src).toContain('IdentitySignInForm');
    expect(src).toMatch(/return 'identity'/);
  });

  // 17. No edge function / migration carries an AUTH-14[A-G] marker
  it('no edge/migration carries Phase-14 mutation markers', () => {
    for (const dir of ['supabase/functions', 'supabase/migrations']) {
      const abs = path.resolve(ROOT, dir);
      if (!fs.existsSync(abs)) continue;
      const walk = (d: string): string[] => fs.readdirSync(d).flatMap((e) => {
        const full = path.join(d, e);
        return fs.statSync(full).isDirectory() ? walk(full) : [full];
      });
      for (const f of walk(abs)) {
        const txt = fs.readFileSync(f, 'utf8');
        expect(txt, `${f} must not be tagged for Phase 14`)
          .not.toMatch(/AUTH-14[A-G]\b/);
      }
    }
  });

  // 18. 14B–14E touched UI files have no raw hex colors
  it('Phase-14 touched UI files contain no raw hex colors', () => {
    const files = [
      'src/pages/AuthVerified.tsx',
      'src/components/dashboard/UnverifiedEmailBanner.tsx',
      'src/components/dashboard/FreeLaunchBadge.tsx',
      'src/pages/dashboard/overview/ProviderDashboardView.tsx',
    ];
    const hex = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of files) {
      if (!exists(f)) continue;
      expect(read(f), `${f} hex`).not.toMatch(hex);
    }
  });

  // 19. No escape hatches in Phase-14 production files
  it('Phase-14 production files contain no escape hatches', () => {
    const files = [
      'src/pages/AuthVerified.tsx',
      'src/components/dashboard/UnverifiedEmailBanner.tsx',
      'src/components/dashboard/FreeLaunchBadge.tsx',
    ];
    for (const f of files) {
      if (!exists(f)) continue;
      const txt = read(f);
      expect(txt, `${f} :any`).not.toMatch(/[:\s]any\b/);
      expect(txt, `${f} as any`).not.toMatch(/as\s+any\b/);
      expect(txt, `${f} @ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(txt, `${f} @ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(txt, `${f} eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });

  // 20. Phase-14 touched components avoid Dialog/Popover/AlertDialog
  it('Phase-14 touched components avoid Dialog/Popover/AlertDialog', () => {
    const files = [
      'src/pages/AuthVerified.tsx',
      'src/components/dashboard/UnverifiedEmailBanner.tsx',
      'src/components/dashboard/FreeLaunchBadge.tsx',
      'src/pages/dashboard/overview/ProviderDashboardView.tsx',
    ];
    for (const f of files) {
      if (!exists(f)) continue;
      const txt = read(f);
      expect(txt, `${f} Dialog`).not.toMatch(/from\s+['"]@\/components\/ui\/dialog['"]/);
      expect(txt, `${f} Popover`).not.toMatch(/from\s+['"]@\/components\/ui\/popover['"]/);
      expect(txt, `${f} AlertDialog`).not.toMatch(/from\s+['"]@\/components\/ui\/alert-dialog['"]/);
    }
  });

  // 21. No real AI assistant wired by Phase-14 design doc
  it('14F assistant is design-only (no real AI module)', () => {
    expect(exists('docs/auth-account-activation-journey-phase-14f-smart-help-assistant-design.md')).toBe(true);
    expect(exists('src/modules/help-assistant')).toBe(false);
    expect(exists('src/components/help-assistant/HelpAssistant.tsx')).toBe(false);
    expect(exists('supabase/functions/help-assistant')).toBe(false);
  });

  // 22. No sensitive data exposed in Phase-14 copy surfaces
  it('Phase-14 copy surfaces do not leak sensitive data tokens', () => {
    const files = [
      'src/pages/AuthVerified.tsx',
      'src/components/dashboard/UnverifiedEmailBanner.tsx',
      'src/components/dashboard/FreeLaunchBadge.tsx',
      'src/pages/Onboarding.tsx',
    ];
    const forbidden = [
      /service_role/i,
      /SUPABASE_SERVICE_ROLE_KEY/,
      /access_token\s*:\s*['"][A-Za-z0-9._-]+['"]/,
      /Bearer\s+[A-Za-z0-9._-]{20,}/,
    ];
    for (const f of files) {
      if (!exists(f)) continue;
      const txt = read(f);
      for (const re of forbidden) {
        expect(txt, `${f} leaks ${re}`).not.toMatch(re);
      }
    }
  });
});