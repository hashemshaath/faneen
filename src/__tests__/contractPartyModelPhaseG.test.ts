/**
 * CONTRACT PARTY MODEL — PHASE G
 * Send draft contract for review (no signature, no acceptance).
 * Source-level + pure helper guards.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { computeSendForReviewEligibility } from '@/modules/contracts/services/sendForReviewEligibility';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PAGE = read('pages/dashboard/DashboardContracts.tsx');
const HELPER = read('modules/contracts/services/sendForReviewEligibility.ts');

const baseContract = {
  id: 'c1',
  business_id: 'b1',
  client_id: 'u2',
  template_version_id: 'tv1',
  terms_ar: 'بنود العقد',
  total_amount: 1000,
};

describe('Phase G — send draft for review', () => {
  it('1. eligible when all required fields are present', () => {
    const e = computeSendForReviewEligibility(baseContract, { hasLineItems: true, isRTL: true });
    expect(e.isEligible).toBe(true);
    expect(e.missing).toEqual([]);
  });

  it('2. send action shown only for draft status owned by the provider', () => {
    expect(PAGE).toMatch(/show:\s*c\.status\s*===\s*'draft'\s*&&\s*user\?\.id\s*===\s*c\.provider_id/);
  });

  it('3. ineligible when first-party (business) is missing', () => {
    const e = computeSendForReviewEligibility({ ...baseContract, business_id: null }, { hasLineItems: true, isRTL: false });
    expect(e.isEligible).toBe(false);
    expect(e.missing).toContain('Missing first party');
  });

  it('4. ineligible when second-party (client) is missing', () => {
    const e = computeSendForReviewEligibility({ ...baseContract, client_id: null }, { hasLineItems: true, isRTL: false });
    expect(e.missing).toContain('Missing second party');
  });

  it('5. ineligible when line items are missing', () => {
    const e = computeSendForReviewEligibility(baseContract, { hasLineItems: false, isRTL: false });
    expect(e.missing).toContain('Missing line items');
  });

  it('6. ineligible when terms or amount are missing', () => {
    const a = computeSendForReviewEligibility({ ...baseContract, terms_ar: '' }, { hasLineItems: true, isRTL: false });
    const b = computeSendForReviewEligibility({ ...baseContract, total_amount: 0 }, { hasLineItems: true, isRTL: false });
    expect(a.missing).toContain('Missing terms');
    expect(b.missing).toContain('Missing amount');
  });

  it('7. dialog renders a summary built via buildContractSummary', () => {
    expect(PAGE).toContain('buildContractSummary');
    expect(PAGE).toContain('data-testid="send-review-summary"');
  });

  it('8. confirm action is disabled while pending or when ineligible (no double-submit)', () => {
    expect(PAGE).toMatch(/disabled=\{sendForApprovalMutation\.isPending\s*\|\|\s*!sendConfirm\s*\|\|\s*!computeSendEligibility\(sendConfirm\)\.isEligible\}/);
    expect(PAGE).toMatch(/data-testid="send-review-confirm"/);
  });

  it('9. success toast says the contract was sent for review', () => {
    expect(PAGE).toContain('تم إرسال العقد للمراجعة');
    expect(PAGE).toContain('Contract sent for review');
  });

  it('10. error toast is sanitized (no raw RPC/DB error surfaced)', () => {
    expect(PAGE).toContain('تعذّر إرسال العقد للمراجعة، حاول لاحقًا');
    expect(PAGE).toContain('Could not send the contract for review, please try again later');
  });

  it('11. no acceptance / signature side effects on send', () => {
    expect(HELPER).not.toMatch(/accept|sign|accepted_at/i);
    // The mutation only calls sendContractForApproval — accept/sign helpers stay separate.
    const sendBlock = PAGE.split('sendForApprovalMutation')[1] ?? '';
    const onlyMutationBody = sendBlock.split('computeSendEligibility')[0] ?? '';
    expect(onlyMutationBody).not.toMatch(/acceptContract\(|signContract\(|client_accepted_at\s*:|provider_accepted_at\s*:/);
  });

  it('12. contract is not marked accepted/signed/active by the send flow', () => {
    const sendBlock = PAGE.split('sendForApprovalMutation')[1]?.split('/* Phase G')[0] ?? '';
    expect(sendBlock).not.toMatch(/status:\s*'(accepted|signed|active|completed)'/);
  });

  it('13. accepted_at is never filled by the send mutation', () => {
    const sendBlock = PAGE.split('sendForApprovalMutation')[1]?.split('/* Phase G')[0] ?? '';
    expect(sendBlock).not.toMatch(/accepted_at\s*:/);
  });

  it('14. no new RPC is introduced — only the existing send_contract_for_approval is used', () => {
    expect(HELPER).not.toMatch(/\.rpc\(/);
    expect(HELPER).not.toMatch(/supabase/i);
    expect(PAGE).toContain('sendContractForApproval(contract.id)');
  });

  it('15. no DB / RLS / migration / edge / service_role references in Phase G files', () => {
    expect(HELPER).not.toMatch(/supabase\/migrations|CREATE TABLE|CREATE POLICY|service_role/i);
  });

  it('16. DashboardContracts.tsx stays under the page line cap (3192)', () => {
    expect(PAGE.split('\n').length).toBeLessThan(3192);
  });

  it('17. helper has no `any` / suppressions', () => {
    expect(/:\s*any\b/.test(HELPER)).toBe(false);
    expect(/\bas\s+any\b/.test(HELPER)).toBe(false);
    expect(HELPER.includes('@ts-ignore')).toBe(false);
    expect(HELPER.includes('@ts-expect-error')).toBe(false);
    expect(HELPER.includes('eslint-disable')).toBe(false);
  });
});