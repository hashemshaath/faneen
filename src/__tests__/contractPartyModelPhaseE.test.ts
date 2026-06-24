/**
 * CONTRACT PARTY MODEL — PHASE E
 * Terms / warranty review before approval (source-level guard).
 *
 * Verifies the pre-submit review summary surfaces first/second party,
 * site, sector, template, scope/terms/warranty/payment terms, duration,
 * delivery and attachments, and blocks final creation while requirements
 * are missing. No lifecycle / RPC / DB changes.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const PAGE = read('pages/dashboard/DashboardContracts.tsx');
const SUMMARY = read('components/contracts/dashboard/create/ContractReviewSummary.tsx');
const DETAILS = read('components/contracts/dashboard/create/ContractDetailsSection.tsx');
const TERMS = read('components/contracts/dashboard/create/ContractTermsSection.tsx');
const HELPER = read('modules/contracts/services/contractParties.ts');

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

  it('5. review surfaces scope / terms / warranty / payment / duration / delivery / attachments rows', () => {
    for (const key of [
      'review-scope-of-work',
      'review-contract-terms',
      'review-warranty',
      'review-payment-terms',
      'review-execution-duration',
      'review-delivery-terms',
      'review-attachments',
    ]) {
      expect(SUMMARY).toContain(key);
    }
    expect(SUMMARY).toContain('نطاق العمل');
    expect(SUMMARY).toContain('بنود العقد');
    expect(SUMMARY).toContain('الضمان');
    expect(SUMMARY).toContain('الدفعات');
    expect(SUMMARY).toContain('مدة التنفيذ');
    expect(SUMMARY).toContain('شروط التسليم');
    expect(SUMMARY).toContain('المرفقات');
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
    expect(PAGE).toMatch(/contractTermsLabel=/);
    expect(PAGE).toMatch(/warrantyLabel=/);
    expect(PAGE).toMatch(/paymentTermsLabel=/);
    expect(PAGE).toMatch(/executionDurationLabel=/);
    expect(PAGE).toMatch(/deliveryTermsLabel=/);
    expect(PAGE).toMatch(/attachmentLabel=/);
  });

  it('8. missing requirements are centralized on the Phase B helper', () => {
    expect(HELPER).toContain('missing_scope_of_work');
    expect(HELPER).toContain('missing_warranty');
    expect(HELPER).toContain('missing_payment_terms');
    expect(HELPER).toContain('missing_execution_duration');
    expect(HELPER).toContain('missing_delivery_terms');
    expect(PAGE).toMatch(/contractParties\.missingRequirements\.map/);
  });

  it('9. submission is disabled until centralized eligibility passes', () => {
    expect(PAGE).toMatch(/const saveBlocked =/);
    expect(PAGE).toMatch(/!contractParties\.isEligible/);
    expect(PAGE).toMatch(/saveDisabled=\{saveBlocked\}/);
    expect(PAGE).toMatch(/executionSiteId:\s*selectedSiteId/);
    expect(PAGE).toMatch(/templateId:\s*effectiveVersion\?\.version_id/);
    expect(PAGE).toMatch(/sectorId:\s*workTypeTouched \? selectedWorkType : null/);
  });

  it('10. scope / warranty / payment / duration messages are clear Arabic copy', () => {
    expect(HELPER).toContain('أضف نطاق العمل قبل إنشاء العقد');
    expect(HELPER).toContain('حدد الضمان أو خيار لا يوجد ضمان');
    expect(HELPER).toContain('حدد الدفعات أو طريقة الدفع المتفق عليها');
    expect(HELPER).toContain('حدد مدة التنفيذ قبل إنشاء العقد');
  });

  it('11. terms / warranty UI appears before any final create action', () => {
    expect(DETAILS).toContain('نطاق العمل');
    expect(DETAILS).toContain('مدة التنفيذ');
    expect(TERMS).toContain('بنود العقد');
    expect(TERMS).toContain('الضمان');
    expect(TERMS).toContain('الدفعات');
    expect(TERMS).toContain('شروط التسليم');
    expect(PAGE.indexOf('<ContractTermsSection')).toBeLessThan(PAGE.indexOf('<ContractCreateActionsBar'));
  });

  it('12. lifecycle is unchanged: created contracts remain draft', () => {
    // Phase E must not introduce new mutation paths beyond the existing
    // createContractMutation. Sanity-check that no new RPCs or status
    // transitions appear in the review summary component.
    expect(PAGE).toMatch(/status:\s*'draft'/);
    expect(SUMMARY).not.toMatch(/supabase/i);
    expect(SUMMARY).not.toMatch(/\.rpc\(/);
    expect(SUMMARY).not.toMatch(/useMutation/);
    expect(SUMMARY).not.toMatch(/service_role/i);
  });

  it('13. Phase E files do not add service_role / RPC / DB migration references', () => {
    const phaseE = [SUMMARY, TERMS, DETAILS, HELPER].join('\n');
    expect(phaseE).not.toMatch(/service_role/i);
    expect(phaseE).not.toMatch(/\.rpc\(/);
    expect(phaseE).not.toMatch(/supabase\/migrations|CREATE TABLE|CREATE POLICY/);
  });

  it('14. Phase E components/helper are type-clean (no any / as any / suppressions)', () => {
    const phaseE = [SUMMARY, TERMS, DETAILS, HELPER].join('\n');
    expect(/:\s*any\b/.test(phaseE)).toBe(false);
    expect(/\bas\s+any\b/.test(phaseE)).toBe(false);
    expect(phaseE.includes('@ts-ignore')).toBe(false);
    expect(phaseE.includes('@ts-expect-error')).toBe(false);
    expect(phaseE.includes('eslint-disable')).toBe(false);
  });

  it('15. DashboardContracts.tsx stays under the page line cap (3192)', () => {
    expect(PAGE.split('\n').length).toBeLessThan(3192);
  });
});