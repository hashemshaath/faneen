/**
 * CONTRACT PARTY MODEL — PHASE E
 * Terms / warranty review before approval (source-level guard).
 *
 * Verifies the pre-submit review summary surfaces first/second party,
 * site, sector, template, scope/warranty/payment terms, execution
 * duration and delivery terms, and that submission is blocked while
 * core requirements are missing.  No lifecycle / RPC / DB changes.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const PAGE = read('pages/dashboard/DashboardContracts.tsx');
const SUMMARY = read('components/contracts/dashboard/create/ContractReviewSummary.tsx');

describe('Phase E — pre-submit contract review', () => {
  it('1. review summary header reads "مراجعة العقد قبل الإرسال"', () => {
    expect(SUMMARY).toContain('مراجعة العقد قبل الإرسال');
  });

  it('2. review surfaces الطرف الأول — الجهة المنفذة', () => {
    expect(SUMMARY).toContain('الطرف الأول — الجهة المنفذة');
    expect(SUMMARY).toContain('review-first-party');
  });

  it('3. review surfaces الطرف الثاني — صاحب الحساب', () => {
    expect(SUMMARY).toContain('الطرف الثاني — صاحب الحساب');
    expect(SUMMARY).toContain('review-second-party');
  });

  it('4. review surfaces execution site / sector / template rows', () => {
    expect(SUMMARY).toContain('review-execution-site');
    expect(SUMMARY).toContain('review-sector');
    expect(SUMMARY).toContain('موقع التنفيذ');
    expect(SUMMARY).toContain('المجال / التخصص');
  });

  it('5. review surfaces scope / warranty / payment / duration / delivery rows', () => {
    for (const key of [
      'review-scope-of-work',
      'review-warranty',
      'review-payment-terms',
      'review-execution-duration',
      'review-delivery-terms',
    ]) {
      expect(SUMMARY).toContain(key);
    }
    expect(SUMMARY).toContain('نطاق العمل');
    expect(SUMMARY).toContain('الضمان');
    expect(SUMMARY).toContain('الدفعات');
    expect(SUMMARY).toContain('مدة التنفيذ');
    expect(SUMMARY).toContain('شروط التسليم');
  });

  it('6. summary exposes both missing (blocking) and warnings (non-blocking) channels', () => {
    expect(SUMMARY).toContain('review-missing');
    expect(SUMMARY).toContain('review-warnings');
  });

  it('7. DashboardContracts wires the review with party + scope props', () => {
    expect(PAGE).toMatch(/firstPartyLabel=\{firstPartyLabel\}/);
    expect(PAGE).toMatch(/secondPartyLabel=\{secondPartyLabel\}/);
    expect(PAGE).toMatch(/executionSiteLabel=/);
    expect(PAGE).toMatch(/sectorLabel=/);
    expect(PAGE).toMatch(/warrantyLabel=/);
    expect(PAGE).toMatch(/paymentTermsLabel=/);
    expect(PAGE).toMatch(/executionDurationLabel=/);
    expect(PAGE).toMatch(/deliveryTermsLabel=/);
    expect(PAGE).toMatch(/warnings=\{warnings\}/);
  });

  it('8. missing site / template / sector are pushed onto the blocking list', () => {
    expect(PAGE).toMatch(/missing\.push\(pickBi\(isRTL, 'موقع التنفيذ'/);
    expect(PAGE).toMatch(/missing\.push\(pickBi\(isRTL, 'قالب عقد منشور'/);
    expect(PAGE).toMatch(/missing\.push\(pickBi\(isRTL, 'المجال \/ التخصص'/);
  });

  it('9. submission is disabled until site + template + sector are set', () => {
    expect(PAGE).toMatch(/saveDisabled=\{[^}]*!selectedSiteId[^}]*\}/);
    expect(PAGE).toMatch(/saveDisabled=\{[^}]*!effectiveVersion[^}]*\}/);
    expect(PAGE).toMatch(/saveDisabled=\{[^}]*!selectedWorkType[^}]*\}/);
  });

  it('10. warranty / payment / duration warnings have clear Arabic messages', () => {
    expect(PAGE).toContain('الضمان غير محدد — يُستمد من القالب');
    expect(PAGE).toContain('الدفعات غير محددة — تُستمد من القالب');
    expect(PAGE).toContain('مدة التنفيذ غير محددة');
  });

  it('11. lifecycle is unchanged: no signature / approval / acceptance triggers introduced', () => {
    // Phase E must not introduce new mutation paths beyond the existing
    // createContractMutation. Sanity-check that no new RPCs or status
    // transitions appear in the review summary component.
    expect(SUMMARY).not.toMatch(/supabase/i);
    expect(SUMMARY).not.toMatch(/\.rpc\(/);
    expect(SUMMARY).not.toMatch(/useMutation/);
    expect(SUMMARY).not.toMatch(/service_role/i);
  });

  it('12. summary component is type-clean (no any / as any / suppressions)', () => {
    expect(/:\s*any\b/.test(SUMMARY)).toBe(false);
    expect(/\bas\s+any\b/.test(SUMMARY)).toBe(false);
    expect(SUMMARY.includes('@ts-ignore')).toBe(false);
    expect(SUMMARY.includes('@ts-expect-error')).toBe(false);
    expect(SUMMARY.includes('eslint-disable')).toBe(false);
  });

  it('13. DashboardContracts.tsx stays under the page line cap (3192)', () => {
    expect(PAGE.split('\n').length).toBeLessThan(3192);
  });
});