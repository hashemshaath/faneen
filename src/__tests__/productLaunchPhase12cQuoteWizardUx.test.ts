/**
 * PRODUCT LAUNCH QA PHASE 12C — RFQ wizard UX guard.
 *
 * Verifies the /quote page exposes a clear stepper, autosave badge,
 * file-upload helper, and review summary — without mutating the
 * submit endpoint, payload field names, draft key, or matching /
 * credits / reveal logic.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const QUOTE = read('pages/Quote.tsx');

describe('Phase 12C — RFQ wizard UX', () => {
  it('1. /quote exposes multiple step labels', () => {
    expect(QUOTE).toMatch(/STEP_LABELS\s*=\s*\[/);
    const labelsBlock = QUOTE.split('STEP_LABELS')[1]?.split('];')[0] ?? '';
    const arLabels = labelsBlock.match(/ar:\s*'/g) ?? [];
    expect(arLabels.length).toBeGreaterThanOrEqual(3);
  });

  it('2. /quote shows a localized "Step X of Y" progress label', () => {
    expect(QUOTE).toMatch(/الخطوة \$\{step\} من \$\{TOTAL_STEPS\}/);
    expect(QUOTE).toMatch(/Step \$\{step\} of \$\{TOTAL_STEPS\}/);
  });

  it('3. /quote has Back / Next navigation CTAs between steps', () => {
    expect(QUOTE).toMatch(/ar="التالي"/);
    expect(QUOTE).toMatch(/ar="السابق"/);
  });

  it('4. final submit CTA renders only at the last step', () => {
    expect(QUOTE).toMatch(/step\s*<\s*TOTAL_STEPS\s*\?[\s\S]+?:\s*\(\s*<Button[\s\S]+?onClick=\{submit\}/);
    expect(QUOTE).toMatch(/إرسال طلب عرض السعر/);
  });

  it('5. autosave / draft badge is rendered', () => {
    expect(QUOTE).toMatch(/data-testid="quote-autosave-badge"/);
    expect(QUOTE).toMatch(/محفوظ تلقائيًا/);
  });

  it('6. file-upload helper text lists formats + size limit', () => {
    expect(QUOTE).toMatch(/data-testid="quote-upload-helper"/);
    expect(QUOTE).toMatch(/10 ميجابايت|10 MB/);
    expect(QUOTE).toMatch(/JPG|PDF/);
  });

  it('7. review summary appears before final submit', () => {
    expect(QUOTE).toMatch(/data-testid="quote-review-summary"/);
    expect(QUOTE).toMatch(/مراجعة سريعة لطلبك/);
  });

  it('8. submit handler still calls submitQuoteRequest (endpoint preserved)', () => {
    expect(QUOTE).toMatch(/submitQuoteRequest\(payload\)/);
  });

  it('9. payload field names are preserved', () => {
    for (const field of [
      'customer_name', 'customer_phone', 'customer_email', 'customer_type',
      'preferred_contact_method', 'sector', 'city', 'district',
      'service_location_type', 'project_description', 'approx_dimensions',
      'quantity', 'execution_timeline', 'has_budget', 'budget_amount',
      'budget_note', 'metadata',
      'preferred_brand_ids', 'brand_preference_mode', 'brand_notes',
    ]) {
      expect(QUOTE).toContain(field + ':');
    }
  });

  it('10. draft storage key is unchanged', () => {
    expect(QUOTE).toMatch(/DRAFT_KEY\s*=\s*'qitaat_quote_draft_v1'/);
  });

  it('11. matching / credits / reveal files are not imported by Quote.tsx', () => {
    expect(QUOTE).not.toMatch(/matching/i);
    expect(QUOTE).not.toMatch(/credits?/i);
    expect(QUOTE).not.toMatch(/reveal/i);
  });

  it('12. no hardcoded hex colors introduced in /quote', () => {
    const matches = QUOTE.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(matches).toEqual([]);
  });

  it('13. no banned suppressions in /quote', () => {
    expect(QUOTE).not.toMatch(/:\s*any\b/);
    expect(QUOTE).not.toMatch(/as\s+any\b/);
    expect(QUOTE).not.toMatch(/@ts-ignore/);
    expect(QUOTE).not.toMatch(/@ts-expect-error/);
    expect(QUOTE).not.toMatch(/eslint-disable(?!-next-line react-hooks\/exhaustive-deps)/);
  });
});