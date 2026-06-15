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

describe('PRODUCT LAUNCH QA PHASE 12F — Final soft-launch readiness guard', () => {
  it('1. Public navbar still exposes a /quote CTA', () => {
    expect(NAVBAR).toMatch(/to="\/quote"/);
  });

  it('2. /quote keeps autosave, upload helper and review summary', () => {
    expect(QUOTE).toMatch(/quote-autosave-badge/);
    expect(QUOTE).toMatch(/quote-upload-helper/);
    expect(QUOTE).toMatch(/quote-review-summary/);
  });

  it('3. /for-providers exposes the primary registration CTA', () => {
    expect(FOR_PROVIDERS).toMatch(/for-providers-primary-cta/);
    expect(FOR_PROVIDERS).toMatch(/PROVIDER_SIGNUP\s*=\s*['"]\/auth\?mode=signup&role=provider['"]/);
  });

  it('4. Provider readiness card keeps completion + visibility copy', () => {
    expect(READINESS_CARD).toMatch(/provider-readiness-card/);
    expect(READINESS_CARD).toMatch(/اكتمال ملفك/);
    expect(READINESS_CARD).toMatch(/provider-visibility-message/);
  });

  it('5. WhatsApp FAB is config-gated and only mounted by the public footer', () => {
    expect(WHATSAPP).toMatch(/VITE_QITAAT_WHATSAPP/);
    expect(WHATSAPP).toMatch(/if\s*\(!configured\)\s*return\s*null/);
    expect(FOOTER).toMatch(/<WhatsAppFab\s*\/>/);
  });

  it('6. Core public routes are still registered', () => {
    for (const path of ['/', '/search', '/quote', '/for-providers', '/onboarding', '/sectors', '/showcase', '/contact', '/about', '/privacy', '/terms']) {
      expect(APP).toMatch(new RegExp(`path="${path.replace(/\//g, '\\/')}"`));
    }
  });

  it('7. Sector landing routes are preserved', () => {
    for (const path of ['/sectors', '/sectors/all', '/sectors/:slug', '/sectors/:sector/:city']) {
      expect(APP).toMatch(new RegExp(`path="${path.replace(/\//g, '\\/').replace(/:/g, ':')}"`));
    }
  });

  it('8. Public profile route /:username is preserved', () => {
    expect(APP).toMatch(/path="\/:username"\s+element=\{<UsernameResolver/);
  });

  it('9. Sitemap / robots / llms / canonical assets are preserved', () => {
    expect(exists('public/robots.txt')).toBe(true);
    expect(exists('public/sitemap.xml')).toBe(true);
    expect(exists('public/llms.txt')).toBe(true);
    expect(read('index.html')).toMatch(/rel="canonical"/);
    expect(exists('supabase/functions/sitemap/index.ts')).toBe(true);
  });

  it('10. Changed public surfaces never import RFQ/matching/credits/reveal logic', () => {
    for (const src of [NAVBAR, FOOTER, WHATSAPP, FOR_PROVIDERS]) {
      expect(src).not.toMatch(/submitQuoteRequest|consume_provider_lead_credit|provider_lead_credit_transactions|reveal_lead/);
    }
  });

  it('11. Onboarding/readiness/visibility logic files are intact', () => {
    expect(READINESS_HOOK).toMatch(/export function useProviderReadiness/);
    expect(ONBOARDING).toMatch(/const STEP_ORDER:\s*OnboardingStep\[\]\s*=/);
    const rpcCount = (READINESS_CARD.match(/supabase\.rpc\(/g) ?? []).length;
    expect(rpcCount).toBeLessThanOrEqual(1);
  });

  it('12. No DB/RLS/RPC/migration/edge surface touched by changed presentational files', () => {
    for (const src of [WHATSAPP, NAVBAR, FOOTER, READINESS_CARD, FOR_PROVIDERS, QUOTE, ONBOARDING]) {
      expect(src).not.toMatch(/from\s+['"]@\/integrations\/supabase\/admin['"]/);
      expect(src).not.toMatch(/supabase\/functions\//);
    }
  });

  it('13. No banned suppressions in changed surfaces', () => {
    for (const src of [WHATSAPP, NAVBAR, FOOTER, READINESS_CARD, FOR_PROVIDERS, QUOTE, ONBOARDING]) {
      expect(/@ts-ignore/.test(src)).toBe(false);
      expect(/@ts-expect-error/.test(src)).toBe(false);
      expect(/\bas\s+any\b/.test(src)).toBe(false);
      expect(/eslint-disable/.test(src)).toBe(false);
    }
  });
});