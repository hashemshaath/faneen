import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');
const exists = (p: string) => existsSync(resolve(process.cwd(), p));

const APP = read('src/App.tsx');
const NAVBAR = read('src/components/layout/Navbar.tsx');
const FOOTER = read('src/components/layout/Footer.tsx');
const WHATSAPP = read('src/components/common/WhatsAppFab.tsx');
const QUOTE = read('src/pages/Quote.tsx');
const FOR_PROVIDERS = read('src/pages/ForProviders.tsx');
const READINESS_CARD = read('src/components/dashboard/ProviderReadinessCard.tsx');
const READINESS_HOOK = read('src/hooks/useProviderReadiness.ts');
const ONBOARDING = read('src/pages/Onboarding.tsx');

describe('PRODUCT LAUNCH QA PHASE 12E — Mobile + Performance + Launch QA guard', () => {
  it('1. Public navbar exposes a /quote CTA', () => {
    expect(NAVBAR).toMatch(/to="\/quote"/);
  });

  it('2. WhatsApp FAB is config-gated and mounted only by the public footer', () => {
    expect(WHATSAPP).toMatch(/VITE_QITAAT_WHATSAPP/);
    expect(WHATSAPP).toMatch(/if\s*\(!configured\)\s*return\s*null/);
    expect(FOOTER).toMatch(/<WhatsAppFab\s*\/>/);
  });

  it('3. /quote keeps wizard progress, autosave badge, upload helper and review summary', () => {
    expect(QUOTE).toMatch(/الخطوة/);
    expect(QUOTE).toMatch(/quote-autosave-badge/);
    expect(QUOTE).toMatch(/quote-upload-helper/);
    expect(QUOTE).toMatch(/quote-review-summary/);
  });

  it('4. /for-providers exposes the primary registration CTA', () => {
    expect(FOR_PROVIDERS).toMatch(/for-providers-primary-cta/);
    expect(FOR_PROVIDERS).toMatch(/PROVIDER_SIGNUP\s*=\s*['"]\/auth\?mode=signup&role=provider['"]/);
  });

  it('5. Provider readiness card keeps the "اكتمال ملفك" framing and visibility line', () => {
    expect(READINESS_CARD).toMatch(/provider-readiness-card/);
    expect(READINESS_CARD).toMatch(/اكتمال ملفك/);
    expect(READINESS_CARD).toMatch(/provider-visibility-message/);
  });

  it('6. Core public routes are still registered in App.tsx', () => {
    for (const path of ['/', '/search', '/quote', '/for-providers', '/onboarding', '/sectors', '/showcase', '/contact', '/about', '/privacy', '/terms']) {
      expect(APP).toMatch(new RegExp(`path="${path.replace(/\//g, '\\/')}"`));
    }
  });

  it('7. Public profile route /:username is preserved', () => {
    expect(APP).toMatch(/path="\/:username"\s+element=\{<UsernameResolver/);
  });

  it('8. Canonical/sitemap/robots/llms assets are preserved', () => {
    expect(exists('public/robots.txt')).toBe(true);
    expect(exists('public/sitemap.xml')).toBe(true);
    expect(exists('public/llms.txt')).toBe(true);
    expect(read('index.html')).toMatch(/rel="canonical"/);
    // Edge-driven dynamic sitemap function still ships.
    expect(exists('supabase/functions/sitemap/index.ts')).toBe(true);
  });

  it('9. Image pipeline files are not touched by this phase (still present)', () => {
    expect(exists('vite.config.ts')).toBe(true);
    const vite = read('vite.config.ts');
    // Sanity: vite config still importable & still includes the React plugin.
    expect(vite).toMatch(/@vitejs\/plugin-react|plugin-react-swc/);
  });

  it('10. RFQ/matching/credits/reveal logic files are not referenced from changed public surfaces', () => {
    for (const src of [NAVBAR, FOOTER, WHATSAPP]) {
      expect(src).not.toMatch(/submitQuoteRequest|consume_provider_lead_credit|provider_lead_credit_transactions|reveal_lead/);
    }
  });

  it('11. Onboarding/readiness/visibility logic files are intact', () => {
    expect(READINESS_HOOK).toMatch(/export function useProviderReadiness/);
    expect(ONBOARDING).toMatch(/const STEP_ORDER:\s*OnboardingStep\[\]\s*=/);
    // Readiness card stays presentational (no new supabase.rpc additions beyond submit_for_review).
    const rpcCount = (READINESS_CARD.match(/supabase\.rpc\(/g) ?? []).length;
    expect(rpcCount).toBeLessThanOrEqual(1);
  });

  it('12. No hardcoded hex colors in NEW presentational surface (WhatsApp FAB) — legacy Navbar/Footer brand hex baselined', () => {
    const stripped = WHATSAPP.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    expect(/#[0-9a-fA-F]{3,8}\b/.test(stripped)).toBe(false);
  });

  it('13. No any/as any/@ts-ignore/@ts-expect-error in changed surfaces (existing eslint-disable counts baselined)', () => {
    for (const src of [WHATSAPP, NAVBAR, FOOTER, READINESS_CARD]) {
      expect(/@ts-ignore/.test(src)).toBe(false);
      expect(/@ts-expect-error/.test(src)).toBe(false);
      expect(/\bas\s+any\b/.test(src)).toBe(false);
    }
  });
});