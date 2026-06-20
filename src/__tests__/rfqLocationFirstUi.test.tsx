/**
 * RFQ LOCATION-FIRST UI — source-level guard.
 *
 * Verifies the /quote form exposes the four location modes (saved site,
 * project, new address, no-address), passes the new location columns to the
 * submit payload, and the admin RFQ details surface location + precision.
 *
 * No DB / RLS / RPC / migrations / edge changes — pure UI guard.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const QUOTE = read('pages/Quote.tsx');
const ADMIN = read('pages/admin/AdminQuoteRequestDetails.tsx');
const SUBMIT_SERVICE = read('modules/quotes/services/submitQuoteRequest.ts');

describe('RFQ Location-First UI', () => {
  it('1. /quote renders the "موقع تنفيذ العمل" section', () => {
    expect(QUOTE).toMatch(/data-testid="quote-location-section"/);
    expect(QUOTE).toMatch(/موقع تنفيذ العمل/);
  });

  it('2. saved-site option is wired', () => {
    expect(QUOTE).toMatch(/data-testid="quote-saved-sites"/);
    expect(QUOTE).toMatch(/data-testid="quote-saved-site-option"/);
    expect(QUOTE).toMatch(/useUserSavedSites/);
  });

  it('3. project option is wired and pre-fills site when linked', () => {
    expect(QUOTE).toMatch(/data-testid="quote-projects"/);
    expect(QUOTE).toMatch(/data-testid="quote-project-option"/);
    expect(QUOTE).toMatch(/useUserProjects/);
    expect(QUOTE).toMatch(/site_id\s*\?\s*savedSites\.find/);
  });

  it('4. project without site prompts for explicit location', () => {
    expect(QUOTE).toMatch(/هذا المشروع بدون موقع/);
  });

  it('5. new-address form exposes region/city/district fields', () => {
    expect(QUOTE).toMatch(/data-testid="quote-location-fields"/);
    expect(QUOTE).toMatch(/id="q-region"/);
    expect(QUOTE).toMatch(/id="q-city"/);
    expect(QUOTE).toMatch(/id="q-district"/);
  });

  it('6. "no address" mode renders the clarification warning', () => {
    expect(QUOTE).toMatch(/data-testid="quote-no-location-warning"/);
    expect(QUOTE).toMatch(/لا أملك عنوانًا محددًا الآن/);
    expect(QUOTE).toMatch(/قد يحتاج فريق قطاعات لتوضيح الموقع/);
  });

  it('7. step-2 validation blocks empty location selection', () => {
    expect(QUOTE).toMatch(/اختر طريقة تحديد موقع تنفيذ العمل/);
    expect(QUOTE).toMatch(/locationMode === 'saved'[\s\S]+?siteId/);
    expect(QUOTE).toMatch(/locationMode === 'new'[\s\S]+?region/);
    expect(QUOTE).toMatch(/locationMode === 'none'[\s\S]+?city OR region/i);
  });

  it('8. payload forwards site_id / project_id / region / no_location_selected / location_precision', () => {
    for (const key of [
      'site_id:',
      'project_id:',
      'region:',
      'no_location_selected:',
      'location_precision:',
    ]) {
      expect(QUOTE).toContain(key);
    }
    expect(QUOTE).toMatch(/deriveLocationPrecision\(/);
  });

  it('9. SubmitQuoteRequestPayload type accepts the new location fields', () => {
    for (const key of ['region?:', 'site_id?:', 'project_id?:', 'no_location_selected?:', 'location_precision?:']) {
      expect(SUBMIT_SERVICE).toContain(key);
    }
  });

  it('10. admin RFQ details surfaces region/site/project/precision/needs-review', () => {
    expect(ADMIN).toMatch(/quote\.region/);
    expect(ADMIN).toMatch(/quote\.site_id/);
    expect(ADMIN).toMatch(/quote\.project_id/);
    expect(ADMIN).toMatch(/quote\.location_precision/);
    expect(ADMIN).toMatch(/quote\.no_location_selected/);
    expect(ADMIN).toMatch(/يحتاج مراجعة/);
  });

  it('11. existing wizard guards are preserved (autosave / draft / endpoint)', () => {
    expect(QUOTE).toMatch(/DRAFT_KEY\s*=\s*'qitaat_quote_draft_v1'/);
    expect(QUOTE).toMatch(/submitQuoteRequest\(payload\)/);
    expect(QUOTE).toMatch(/data-testid="quote-autosave-badge"/);
  });

  it('12. no DB / RLS / RPC / migrations / edge artifacts in this change set', () => {
    expect(QUOTE).not.toMatch(/supabase\.rpc\(/);
    expect(QUOTE).not.toMatch(/functions\.invoke\((?!'submit-quote-request')/);
  });

  it('13. no banned suppressions or hardcoded hex colors introduced', () => {
    expect(QUOTE).not.toMatch(/:\s*any\b/);
    expect(QUOTE).not.toMatch(/as\s+any\b/);
    expect(QUOTE).not.toMatch(/@ts-ignore/);
    expect(QUOTE).not.toMatch(/@ts-expect-error/);
    const hexes = QUOTE.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexes).toEqual([]);
  });

  it('14. no hardcoded city/district list shipped in /quote', () => {
    // The new UI must not bundle a fake AR cities array.
    expect(QUOTE).not.toMatch(/SAUDI_CITIES\s*=\s*\[/);
    expect(QUOTE).not.toMatch(/FAKE_CITIES/);
  });
});