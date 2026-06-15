/**
 * DASHBOARD EXPERIENCE PHASE B3 — Provider Action Center + Profile Completion guards.
 *
 * Static/source-level guards only (no DOM rendering of the heavy provider
 * dashboard which depends on Auth + Supabase). Verifies:
 *
 *  - ProviderDashboardView wires DashboardActionCenter with role="provider"
 *    and renders the expected provider CTAs.
 *  - The new ProviderVisibilityStatusCard exists and renders the three
 *    documented messages, while reading existing readiness state only.
 *  - ProviderReadinessCard is still mounted in the provider overview.
 *  - Provider overview does not leak admin/user-only actions.
 *  - Readiness/visibility/onboarding source files were NOT modified by B3.
 *  - No hex colors / `any` / ts-ignore / eslint-disable / dialogs in the
 *    new code touched in this phase.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

const PROVIDER_VIEW = 'src/pages/dashboard/overview/ProviderDashboardView.tsx';
const VISIBILITY_CARD = 'src/components/dashboard/ProviderVisibilityStatusCard.tsx';
const READINESS_CARD = 'src/components/dashboard/ProviderReadinessCard.tsx';

const PROVIDER_SRC = read(PROVIDER_VIEW);
const VISIBILITY_SRC = read(VISIBILITY_CARD);

describe('Phase B3 — Provider Action Center', () => {
  it('mounts DashboardActionCenter with role="provider"', () => {
    expect(PROVIDER_SRC).toMatch(/DashboardActionCenter/);
    expect(PROVIDER_SRC).toMatch(/role="provider"/);
  });

  it('renders the required provider CTAs', () => {
    expect(PROVIDER_SRC).toMatch(/أكمل ملفك/);
    expect(PROVIDER_SRC).toMatch(/أضف الخدمات والصور/);
    expect(PROVIDER_SRC).toMatch(/راجع حالة الظهور/);
    expect(PROVIDER_SRC).toMatch(/تابع طلبات العملاء/);
    expect(PROVIDER_SRC).toMatch(/حدّث مناطق الخدمة/);
  });

  it('uses existing in-app routes only for those CTAs', () => {
    expect(PROVIDER_SRC).toMatch(/'\/dashboard\/business-completion'/);
    expect(PROVIDER_SRC).toMatch(/'\/dashboard\/services'/);
    expect(PROVIDER_SRC).toMatch(/'\/dashboard\/business-visibility'/);
    expect(PROVIDER_SRC).toMatch(/'\/dashboard\/leads'/);
    expect(PROVIDER_SRC).toMatch(/'\/dashboard\/provider\/service-areas'/);
  });

  it('does not leak admin or user-only actions', () => {
    expect(PROVIDER_SRC).not.toMatch(/role="admin"/);
    expect(PROVIDER_SRC).not.toMatch(/role="user"/);
    expect(PROVIDER_SRC).not.toMatch(/مراجعة المزودين/);
    expect(PROVIDER_SRC).not.toMatch(/افتح مراكز الإدارة/);
    expect(PROVIDER_SRC).not.toMatch(/اطلب عرض سعر/);
    expect(PROVIDER_SRC).not.toMatch(/استعرض المزودين/);
  });
});

describe('Phase B3 — Profile completion guidance + Visibility card', () => {
  it('ProviderReadinessCard is still mounted in the overview', () => {
    expect(PROVIDER_SRC).toMatch(/<ProviderReadinessCard\s*\/>/);
  });

  it('shows the profile completion guidance copy above readiness', () => {
    expect(PROVIDER_SRC).toMatch(/كلما اكتمل ملفك/);
  });

  it('ProviderVisibilityStatusCard file exists and is mounted', () => {
    expect(existsSync(join(ROOT, VISIBILITY_CARD))).toBe(true);
    expect(PROVIDER_SRC).toMatch(/<ProviderVisibilityStatusCard\s*\/>/);
  });

  it('Visibility card renders the three documented messages', () => {
    expect(VISIBILITY_SRC).toMatch(/ملفك ظاهر الآن للعملاء/);
    expect(VISIBILITY_SRC).toMatch(/ملفك غير ظاهر للعامة حتى يكتمل الحد الأدنى ويتم اعتماده/);
    expect(VISIBILITY_SRC).toMatch(/ملفك بانتظار مراجعة فريق قطاعات/);
  });

  it('Visibility card reads existing readiness hook — no new queries/mutations/services', () => {
    expect(VISIBILITY_SRC).toMatch(/useProviderReadiness/);
    expect(VISIBILITY_SRC).not.toMatch(/useQuery/);
    expect(VISIBILITY_SRC).not.toMatch(/useMutation/);
    expect(VISIBILITY_SRC).not.toMatch(/@\/integrations\/supabase/);
    expect(VISIBILITY_SRC).not.toMatch(/from\s+['"]@\/modules\//);
    expect(VISIBILITY_SRC).not.toMatch(/supabase\./);
  });
});

describe('Phase B3 — Forbidden patterns in new/touched code', () => {
  it.each([PROVIDER_VIEW, VISIBILITY_CARD])(
    '%s has no hex colors / any / ts-ignore / eslint-disable / dialogs',
    (file) => {
      const src = read(file);
      // No raw hex colors. Allow CSS-var driven hsl(var(--…)) only.
      const hexes = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      expect(hexes).toEqual([]);
      expect(src).not.toMatch(/:\s*any\b/);
      expect(src).not.toMatch(/\bas\s+any\b/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/@ts-expect-error/);
      expect(src).not.toMatch(/eslint-disable/);
      expect(src).not.toMatch(/from\s+['"]@\/components\/ui\/dialog/);
      expect(src).not.toMatch(/<AlertDialog\b/);
    },
  );
});

describe('Phase B3 — Untouched logic surfaces', () => {
  // Sanity: the readiness card source itself should still exist and not be
  // rewritten in this phase. We check for the well-known imports introduced
  // before B3 (useProviderReadiness + submit_business_for_review RPC).
  it('ProviderReadinessCard preserves its existing structure', () => {
    const src = read(READINESS_CARD);
    expect(src).toMatch(/useProviderReadiness/);
    expect(src).toMatch(/submit_business_for_review/);
  });

  // Hard-stop: readiness/visibility/onboarding logic files must remain
  // present (we don't validate every line — only that they weren't deleted
  // or replaced by stubs).
  const protectedFiles = [
    'src/hooks/useProviderReadiness.ts',
  ];
  it.each(protectedFiles)('%s still exists with substantive content', (rel) => {
    const full = join(ROOT, rel);
    expect(existsSync(full)).toBe(true);
    expect(statSync(full).size).toBeGreaterThan(500);
  });
});