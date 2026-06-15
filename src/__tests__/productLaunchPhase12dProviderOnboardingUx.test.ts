import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

const FOR_PROVIDERS = read('src/pages/ForProviders.tsx');
const ONBOARDING = read('src/pages/Onboarding.tsx');
const APP = read('src/App.tsx');
const READINESS_CARD = read('src/components/dashboard/ProviderReadinessCard.tsx');
const READINESS_HOOK = read('src/hooks/useProviderReadiness.ts');
const VISIBILITY_EDITOR_PATH = 'src/components/business/BusinessVisibilityEditor.tsx';
const PUBLISH_PANEL_PATH = 'src/components/business/PublishReadinessPanel.tsx';

describe('PRODUCT LAUNCH QA PHASE 12D — Provider onboarding + profile UX guard', () => {
  it('1. /for-providers has a clear primary CTA to the provider signup/registration route', () => {
    expect(FOR_PROVIDERS).toMatch(/for-providers-primary-cta/);
    // Primary CTA target must be the real registration route (signup or onboarding).
    expect(FOR_PROVIDERS).toMatch(/PROVIDER_SIGNUP\s*=\s*['"]\/auth\?mode=signup&role=provider['"]/);
    expect(FOR_PROVIDERS).toMatch(/cta_primary_href\s*\|\|\s*PROVIDER_SIGNUP/);
  });

  it('2. /for-providers does not embed a lead form that mimics the final registration', () => {
    // No <form> elements and no submit handlers — the page is informational + CTA only.
    expect(/<form[\s>]/i.test(FOR_PROVIDERS)).toBe(false);
    expect(/onSubmit\s*=/.test(FOR_PROVIDERS)).toBe(false);
  });

  it('3. /join-as-provider redirect is preserved', () => {
    expect(APP).toMatch(/path="\/join-as-provider"[^>]*element=\{<Navigate\s+to="\/for-providers"\s+replace\s*\/>\}/);
  });

  it('4. Onboarding shows clear step progress with labels', () => {
    expect(ONBOARDING).toMatch(/الخطوة 1 من 3/);
    expect(ONBOARDING).toMatch(/الخطوة 2 من 3/);
    expect(ONBOARDING).toMatch(/الخطوة 3 من 3/);
    expect(ONBOARDING).toMatch(/<Progress[\s\S]*?completionPct/);
  });

  it('5. STEP_ORDER is unchanged (still declared, untouched here)', () => {
    expect(ONBOARDING).toMatch(/const STEP_ORDER:\s*OnboardingStep\[\]\s*=/);
  });

  it('6. Onboarding states review is required before public visibility', () => {
    expect(ONBOARDING).toMatch(/onboarding-review-note/);
    expect(ONBOARDING).toMatch(/يراجع فريق قطاعات/);
  });

  it('7. Provider readiness card has the "اكتمال ملفك" framing', () => {
    expect(READINESS_CARD).toMatch(/provider-readiness-card/);
    expect(READINESS_CARD).toMatch(/اكتمال ملفك/);
    expect(READINESS_CARD).toMatch(/كلما اكتمل ملفك/);
    expect(READINESS_CARD).toMatch(/provider-visibility-message/);
    expect(READINESS_CARD).toMatch(/ملفك غير ظاهر للعامة/);
    expect(READINESS_CARD).toMatch(/ملفك ظاهر الآن للعملاء/);
  });

  it('8. Readiness calculation hook is not mutated (still derives missing/status/completion)', () => {
    expect(READINESS_HOOK).toMatch(/export function useProviderReadiness/);
    expect(READINESS_HOOK).toMatch(/onboarding_completion/);
    expect(READINESS_HOOK).toMatch(/approval_status/);
  });

  it('9. Public visibility logic files are not touched by this phase (BusinessVisibilityEditor still exists)', () => {
    // We do not import or re-implement visibility logic from the readiness card.
    expect(READINESS_CARD).not.toMatch(/BusinessVisibilityEditor/);
    expect(READINESS_CARD).not.toMatch(/computePublicVisibility/);
    // File still exists.
    expect(() => read(VISIBILITY_EDITOR_PATH)).not.toThrow();
  });

  it('10. BusinessVisibilityEditor is not referenced from changed UI surfaces', () => {
    expect(FOR_PROVIDERS).not.toMatch(/BusinessVisibilityEditor/);
    expect(ONBOARDING).not.toMatch(/BusinessVisibilityEditor/);
  });

  it('11. PublishReadinessPanel logic is not invoked from the readiness card', () => {
    expect(READINESS_CARD).not.toMatch(/PublishReadinessPanel/);
    expect(() => read(PUBLISH_PANEL_PATH)).not.toThrow();
  });

  it('12. No new Supabase RPC/edge/migration calls introduced in presentational changes', () => {
    // For-providers + onboarding header changes must not introduce raw .rpc('submit_business...') calls outside existing ones.
    expect(FOR_PROVIDERS).not.toMatch(/supabase\.rpc\(/);
    // ProviderReadinessCard already had ONE rpc (submit_business_for_review) — ensure count unchanged.
    const rpcCount = (READINESS_CARD.match(/supabase\.rpc\(/g) ?? []).length;
    expect(rpcCount).toBe(1);
  });

  it('13. No hardcoded hex colors in changed presentational files', () => {
    for (const src of [FOR_PROVIDERS, ONBOARDING, READINESS_CARD]) {
      expect(/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))).toBe(false);
    }
  });

  it('14. No any/as any/@ts-ignore/@ts-expect-error/eslint-disable in changed files', () => {
    for (const src of [FOR_PROVIDERS, ONBOARDING, READINESS_CARD]) {
      expect(/@ts-ignore/.test(src)).toBe(false);
      expect(/@ts-expect-error/.test(src)).toBe(false);
      expect(/eslint-disable/.test(src)).toBe(false);
      expect(/\bas\s+any\b/.test(src)).toBe(false);
    }
  });
});