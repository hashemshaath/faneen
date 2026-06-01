import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8');

/**
 * UX-REDESIGN-2 — /for-providers invariants.
 * Locks the redesigned provider landing against regressions: real CTAs,
 * public-safe outbound links, no admin/dashboard leaks, no unverifiable
 * legal/availability/pricing claims, removed fake-proof components.
 */
describe('UX-REDESIGN-2 — /for-providers', () => {
  const src = read('src/pages/ForProviders.tsx');

  it('keeps the canonical /for-providers metadata', () => {
    expect(src).toMatch(/canonical:\s*['"]https:\/\/qitaat\.com\/for-providers['"]/);
    expect(src).toMatch(/usePageMeta\s*\(/);
    expect(src).toMatch(/useMultiJsonLd\s*\(/);
  });

  it('primary CTA targets the provider signup route', () => {
    expect(src).toContain("'/auth?mode=signup&role=provider'");
    expect(src).toMatch(/PROVIDER_SIGNUP\s*=\s*['"]\/auth\?mode=signup&role=provider['"]/);
  });

  it('exposes real public routes for capabilities and footer links', () => {
    for (const route of ['/services', '/brands', '/showcase', '/membership', '/sectors', '/contact', '/about#trust']) {
      expect(src).toContain(route);
    }
  });

  it('does not link to admin/dashboard/onboarding from the public landing', () => {
    expect(src).not.toMatch(/to=["']\/dashboard/);
    expect(src).not.toMatch(/to=["']\/admin/);
    expect(src).not.toMatch(/to=["']\/onboarding/);
  });

  it('removes unverifiable legal/availability claims', () => {
    expect(src).not.toMatch(/PDPL/i);
    expect(src).not.toMatch(/استضافة (داخل|في) (السعودية|المنطقة)/);
    expect(src).not.toMatch(/Regionally hosted/i);
    expect(src).not.toMatch(/24\s*\/\s*7/);
    expect(src).not.toMatch(/الأفضل في السعودية/);
    expect(src).not.toMatch(/نضمن (الجودة|الأسعار|الظهور|النتائج)/);
  });

  it('does not hard-code tier prices or launch offers', () => {
    // Removed: TIERS array, 99/299 SAR literals, "90 days free" launch banner.
    expect(src).not.toMatch(/\b99\b\s*[^0-9]*SAR/);
    expect(src).not.toMatch(/\b299\b\s*[^0-9]*SAR/);
    expect(src).not.toMatch(/٩٩|٢٩٩/);
    expect(src).not.toMatch(/90 days free/i);
    expect(src).not.toMatch(/90\s*يومًا\s*مجانًا/);
  });

  it('removes fake-proof components (live ticker, ROI calculator, sticky CTA bar)', () => {
    expect(src).not.toMatch(/LiveTicker/);
    expect(src).not.toMatch(/RoiCalculator/);
    expect(src).not.toMatch(/StickyCtaBar/);
    expect(src).not.toMatch(/SectionSubNav/);
  });

  it('does not hard-code a satisfaction percentage', () => {
    // The old fallback was 98%. Real DB stats only.
    expect(src).not.toMatch(/satisfaction\s*\?\?\s*98/);
    expect(src).not.toMatch(/\b98%\b/);
  });

  it('mentions the core provider capabilities required by the brief', () => {
    for (const phrase of [
      'إدارة الخدمات',
      'ربط العلامات',
      'نشر الأعمال',
      'استقبال الفرص',
      'بروفايل عام',
      'فريق العمل',
      'العضوية',
    ]) {
      expect(src).toContain(phrase);
    }
  });

  it('uses soft framing for partial/membership-gated features', () => {
    // Required vocabulary so we never re-introduce unconditional promises.
    for (const safe of ['يدعم', 'يساعد', 'عند تفعيل', 'حسب الخطة']) {
      expect(src).toContain(safe);
    }
  });

  it('keeps a verification disclaimer about execution outcomes', () => {
    expect(src).toMatch(/لا نضمن نتائج التنفيذ|outcomes are not guaranteed/i);
  });

  it('FAQ has a safe fallback so the page never ships an empty FAQ', () => {
    expect(src).toMatch(/FALLBACK_FAQ/);
    expect(src).toMatch(/هل التسجيل مجاني/);
    expect(src).toMatch(/هل الظهور مضمون/);
  });
});