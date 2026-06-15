/**
 * PRODUCT LAUNCH QA PHASE 12B — Homepage + Search + Sector UX guard.
 *
 * Audit-only phase: this guard verifies the conversion + trust additions
 * shipped without touching RFQ submit / matching / credits / reveal logic
 * and without introducing inflated trust numbers, popups, or banned
 * suppressions.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const HOME_V2 = read('components/home/v2/HomeV2.tsx');
const NAVBAR = read('components/layout/Navbar.tsx');
const SEARCH_EMPTY = read('components/search/v3/SearchEmptyStateV3.tsx');
const FAB = read('components/common/WhatsAppFab.tsx');
const FOOTER = read('components/layout/Footer.tsx');
const APP_TSX = read('App.tsx');

describe('Phase 12B — Home/Search/Sector UX', () => {
  it('1. Home hero exposes a primary CTA pointing to /quote', () => {
    expect(HOME_V2).toMatch(/quote:\s*['"]\/quote['"]/);
    expect(HOME_V2).toMatch(/<PrimaryCTA[\s\S]*?to=\{ROUTES\.quote\}/);
  });

  it('2. Hero CTA label uses the canonical "اطلب عرض سعر" copy', () => {
    expect(HOME_V2).toMatch(/اطلب عرض سعر مجانًا/);
  });

  it('3. Hero ships a mobile-visible social-proof / trust strip', () => {
    // Desktop strip is hidden md:flex; the new mobile-only strip uses md:hidden.
    expect(HOME_V2).toMatch(/md:hidden[\s\S]*?مزودون موثّقون/);
  });

  it('4. Trust copy contains no inflated fake numbers', () => {
    const trustSlice = HOME_V2;
    // No standalone "10,000" / "5000+" / "1M" / "100k" style placeholders.
    expect(trustSlice).not.toMatch(/\b(?:10[\s,]?000|5[\s,]?000\+|1\s?M\+?|100\s?k\+?)\b/i);
  });

  it('5. Public Navbar exposes a visible CTA pointing to /quote', () => {
    expect(NAVBAR).toMatch(/to="\/quote"/);
    expect(NAVBAR).toMatch(/اطلب عرض سعر/);
  });

  it('6. Search empty state offers a CTA to /quote', () => {
    expect(SEARCH_EMPTY).toMatch(/to="\/quote"/);
    expect(SEARCH_EMPTY).toMatch(/اطلب عرض سعر|Request a quote/);
  });

  it('7. Sectors group surfaces a canonical /sectors link (no duplicate confusion)', () => {
    // /sectors must be present in the Sectors mega-menu.
    expect(NAVBAR).toMatch(/to:\s*['"]\/sectors['"]/);
  });

  it('8. Legacy sector routes remain wired in App.tsx', () => {
    for (const p of ['/sectors', '/sectors/all', '/sectors/:slug', '/categories']) {
      expect(APP_TSX).toContain(`path="${p}"`);
    }
  });

  it('9. WhatsApp FAB is config-gated and admin-safe', () => {
    // Must read env, never hard-code a phone number, and return null when missing.
    expect(FAB).toMatch(/VITE_QITAAT_WHATSAPP/);
    expect(FAB).toMatch(/return null/);
    // Must NOT contain a hard-coded Saudi MSISDN.
    expect(FAB).not.toMatch(/\b9665\d{8}\b/);
    // Mounted from public Footer only.
    expect(FOOTER).toMatch(/WhatsAppFab/);
  });

  it('10. RFQ submit / matching / credits / reveal modules were not touched', () => {
    // Phase 12B is presentation-only; none of the touched files should import
    // RFQ submit / matching / credit / reveal services.
    const touched = [HOME_V2, NAVBAR, SEARCH_EMPTY, FAB, FOOTER];
    for (const src of touched) {
      expect(src).not.toMatch(/submitQuoteRequest/);
      expect(src).not.toMatch(/consume_provider_lead_credit/);
      expect(src).not.toMatch(/provider_lead_credit_transactions/);
      expect(src).not.toMatch(/reveal_contact|contact_reveal/);
      expect(src).not.toMatch(/matching_run|matchingService/);
    }
  });

  it('11. No hard-coded hex colors introduced in the new presentational code', () => {
    // Allow tokens (text-emerald-300 etc.) but ban inline `#rrggbb`.
    const hex = /#[0-9a-fA-F]{6}\b/;
    expect(FAB).not.toMatch(hex);
    expect(SEARCH_EMPTY).not.toMatch(hex);
  });

  it('12. No suppressions (any / @ts-ignore / @ts-expect-error / eslint-disable)', () => {
    const banned = [
      /\bas any\b/, /:\s*any\b/, /@ts-ignore/, /@ts-expect-error/, /eslint-disable/,
    ];
    const newFiles = [FAB];
    for (const src of newFiles) {
      for (const re of banned) expect(src).not.toMatch(re);
    }
    // Touched-but-existing files: only check that we didn't ADD them by
    // grepping for the exact substrings introduced here.
    for (const src of [HOME_V2, NAVBAR, SEARCH_EMPTY, FOOTER]) {
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/@ts-expect-error/);
    }
  });
});