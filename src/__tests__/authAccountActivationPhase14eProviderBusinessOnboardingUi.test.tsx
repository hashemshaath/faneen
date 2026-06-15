import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, '..', '..', p), 'utf8');
const exists = (p: string) => fs.existsSync(path.resolve(__dirname, '..', '..', p));

describe('AUTH-14E · Provider/Business onboarding UI-only fixes guard', () => {
  // 1. /onboarding contains explicit review-before-visibility messaging
  it('onboarding surfaces review-before-visibility messaging', () => {
    const src = read('src/pages/Onboarding.tsx');
    expect(src).toMatch(/يراجع فريق قطاعات/);
    expect(src).toMatch(/onboarding-review-note/);
  });

  // 2. UX warning prevents duplicate business creation
  it('onboarding intent screen warns against duplicate entity creation', () => {
    const src = read('src/pages/Onboarding.tsx');
    expect(src).toMatch(/onboarding-duplicate-warning/);
    expect(src).toMatch(/إذا كانت منشأتك مسجلة مسبقًا في قطاعات/);
    expect(src).toMatch(/already registered on Qitaat/);
  });

  // 3. request-access has clarification copy + is not presented as fully automated
  it('request-access carries admin-approval clarification copy', () => {
    const src = read('src/pages/Onboarding.tsx');
    expect(src).toMatch(/request-access-clarification/);
    expect(src).toMatch(/يحتاج مراجعة من مسؤول المنشأة/);
    expect(src).toMatch(/requires approval from its administrator/);
  });

  // 4. FreeLaunchBadge carries both active + available copy and the no-charge note
  it('FreeLaunchBadge presents corrected active/available copy + no-charge note', () => {
    const src = read('src/components/dashboard/FreeLaunchBadge.tsx');
    expect(src).toMatch(/خطة الإطلاق المجانية مفعّلة/);
    expect(src).toMatch(/Free Launch plan active/);
    expect(src).toMatch(/خطة الإطلاق المجانية متاحة للمزودين المؤهلين/);
    expect(src).toMatch(/available to eligible providers/);
    expect(src).toMatch(/لا يتم احتساب أي رسوم خلال مرحلة الإطلاق التجريبي/);
    expect(src).toMatch(/No charges are applied during the soft-launch phase/);
    // accepts both DB-mirrored "free" and modern "free_launch" as active
    expect(src).toMatch(/normalized === 'free_launch'/);
    expect(src).toMatch(/normalized === 'free'/);
  });

  // 5. Provider dashboard renders a state-aware "Next step" guidance block
  it('provider dashboard renders next-step guidance', () => {
    const src = read('src/pages/dashboard/overview/ProviderDashboardView.tsx');
    expect(src).toMatch(/provider-next-step-guidance/);
    expect(src).toMatch(/الخطوة التالية/);
    expect(src).toMatch(/Next step/);
    expect(src).toMatch(/يراجع فريق قطاعات|wait for the Qitaat team/);
  });

  // 6. Notification copy inventory doc exists with all required entries
  it('notification copy inventory doc exists and covers all required entries', () => {
    const p = 'docs/auth-account-activation-phase-14e-notification-copy-inventory.md';
    expect(exists(p)).toBe(true);
    const md = read(p);
    for (const heading of [
      'Account created',
      'Email verified',
      'Business created',
      'Business awaiting review',
      'Business approved',
      'Business rejected',
      'Free Launch plan active',
      'Profile incomplete',
      'Join request requires invitation',
      'Password recovery',
    ]) {
      expect(md, `inventory missing: ${heading}`).toContain(heading);
    }
  });

  // 7. STEP_ORDER must not change
  it('STEP_ORDER is preserved verbatim', () => {
    const src = read('src/pages/Onboarding.tsx');
    expect(src).toMatch(
      /const STEP_ORDER: OnboardingStep\[\] = \[\s*'intent', 'account-type', 'business-details', 'details', 'phone-verify',\s*'documents', 'summary',\s*\];/,
    );
  });

  // 8. onboarding save/submit (completeOnboarding) signature is untouched
  it('completeOnboarding still calls authService.updateProfile + createBusiness', () => {
    const src = read('src/pages/Onboarding.tsx');
    expect(src).toMatch(/await authService\.updateProfile\(user!\.id, \{/);
    expect(src).toMatch(/await authService\.createBusiness\(user!\.id, businessName, username/);
  });

  // 9. readiness calculation file is untouched by 14E (no markers added)
  it('ProviderReadinessCard contains no 14E mutation markers', () => {
    if (!exists('src/components/dashboard/ProviderReadinessCard.tsx')) return;
    const src = read('src/components/dashboard/ProviderReadinessCard.tsx');
    expect(src).not.toMatch(/AUTH-14E/);
    expect(src).not.toMatch(/provider-next-step-guidance/);
  });

  // 10. visibility logic file is untouched by 14E
  it('ProviderVisibilityStatusCard contains no 14E mutation markers', () => {
    if (!exists('src/components/dashboard/ProviderVisibilityStatusCard.tsx')) return;
    const src = read('src/components/dashboard/ProviderVisibilityStatusCard.tsx');
    expect(src).not.toMatch(/AUTH-14E/);
  });

  // 11. ensure_provider_subscription not modified by 14E
  it('no migration created in 14E touches ensure_provider_subscription', () => {
    const dir = path.resolve(__dirname, '..', '..', 'supabase', 'migrations');
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const txt = fs.readFileSync(path.join(dir, f), 'utf8');
      if (/AUTH-14E|auth-account-activation.*14e|phase\s*14e/i.test(txt)) {
        throw new Error(`Migration ${f} appears to be tagged for Phase 14E`);
      }
    }
  });

  // 12. credits module / cron not modified by 14E
  it('no 14E marker leaks into credits/cron modules', () => {
    const files = [
      'src/modules/credits',
      'supabase/functions/_shared/credits',
    ];
    for (const dir of files) {
      const abs = path.resolve(__dirname, '..', '..', dir);
      if (!fs.existsSync(abs)) continue;
      const walk = (d: string): string[] => fs.readdirSync(d).flatMap((entry) => {
        const full = path.join(d, entry);
        return fs.statSync(full).isDirectory() ? walk(full) : [full];
      });
      for (const f of walk(abs)) {
        const txt = fs.readFileSync(f, 'utf8');
        expect(txt, `${f} must not be tagged for Phase 14E`).not.toMatch(/AUTH-14E/);
      }
    }
  });

  // 13. No DB/RLS/RPC/migrations/edge changes carry an AUTH-14E marker
  it('no edge function carries an AUTH-14E marker', () => {
    const dir = path.resolve(__dirname, '..', '..', 'supabase', 'functions');
    if (!fs.existsSync(dir)) return;
    const walk = (d: string): string[] => fs.readdirSync(d).flatMap((entry) => {
      const full = path.join(d, entry);
      return fs.statSync(full).isDirectory() ? walk(full) : [full];
    });
    for (const f of walk(dir)) {
      const txt = fs.readFileSync(f, 'utf8');
      expect(txt, `${f} must not be tagged for Phase 14E`).not.toMatch(/AUTH-14E/);
    }
  });

  // 14. No hardcoded hex colors in 14E-modified files
  it('14E-touched UI files use semantic tokens, never raw hex', () => {
    const files = [
      'src/components/dashboard/FreeLaunchBadge.tsx',
      'src/pages/dashboard/overview/ProviderDashboardView.tsx',
    ];
    const hexRe = /#[0-9a-fA-F]{3,8}\b/;
    for (const f of files) {
      const txt = read(f);
      expect(txt, `${f} must not contain raw hex colors`).not.toMatch(hexRe);
    }
  });

  // 15. No `any` / @ts-ignore / @ts-expect-error / eslint-disable in 14E
  //     production files (the guard test itself mentions these tokens in
  //     comments, so it is intentionally excluded from the scan).
  it('14E production files contain no escape hatches', () => {
    const files = [
      'src/components/dashboard/FreeLaunchBadge.tsx',
    ];
    for (const f of files) {
      const txt = read(f);
      expect(txt, `${f} :any`).not.toMatch(/[:\s]any\b/);
      expect(txt, `${f} as any`).not.toMatch(/as\s+any\b/);
      expect(txt, `${f} @ts-ignore`).not.toMatch(/@ts-ignore/);
      expect(txt, `${f} @ts-expect-error`).not.toMatch(/@ts-expect-error/);
      expect(txt, `${f} eslint-disable`).not.toMatch(/eslint-disable/);
    }
  });

  // 16. No popups / dialogs introduced in 14E-touched components
  it('14E components avoid Dialog/Popover/Modal primitives', () => {
    const files = [
      'src/components/dashboard/FreeLaunchBadge.tsx',
      'src/pages/dashboard/overview/ProviderDashboardView.tsx',
    ];
    for (const f of files) {
      const txt = read(f);
      // these primitives, when introduced, are imported by name
      expect(txt, `${f} introduces Dialog`).not.toMatch(/from\s+['"]@\/components\/ui\/dialog['"]/);
      expect(txt, `${f} introduces Popover`).not.toMatch(/from\s+['"]@\/components\/ui\/popover['"]/);
      expect(txt, `${f} introduces AlertDialog`).not.toMatch(/from\s+['"]@\/components\/ui\/alert-dialog['"]/);
    }
  });
});