/**
 * CONTRACT PARTY MODEL — PHASE F
 * Draft output + creation traceability (source-level guards).
 *
 * Verifies that creating a contract yields a complete, draft-state record
 * with all party / site / sector / template / terms / warranty / payment
 * fields persisted, the workspace post-creation toast remains intact, and
 * that no new RPC / DB / lifecycle changes were introduced.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildContractSummary,
  type ContractSummary,
} from '@/modules/contracts/services/contractSummary';

const ROOT = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const PAGE = read('pages/dashboard/DashboardContracts.tsx');
const WORKSPACE = read('components/workspace/WorkspaceContractsTab.tsx');
const SUMMARY_HELPER = read('modules/contracts/services/contractSummary.ts');
const PARTIES = read('modules/contracts/services/contractParties.ts');

describe('Phase F — draft output + traceability', () => {
  it('1. central contract summary helper exists and returns a draft summary', () => {
    const s: ContractSummary = buildContractSummary({
      title: 'عقد تجريبي',
      firstPartyDisplayName: 'منشأة أ',
      secondPartyDisplayName: 'صاحب الحساب',
      executionSiteLabel: 'موقع 1',
      sectorLabel: 'كهرباء',
      templateLabel: 'قالب عام',
      lineItemsCount: 3,
      hasWarranty: true,
      hasPayments: true,
      source: 'workspace',
    });
    expect(s.isDraft).toBe(true);
    expect(s.status).toBe('draft');
    expect(s.firstPartyDisplayName).toBe('منشأة أ');
    expect(s.secondPartyDisplayName).toBe('صاحب الحساب');
    expect(s.executionSiteLabel).toBe('موقع 1');
    expect(s.sectorLabel).toBe('كهرباء');
    expect(s.templateLabel).toBe('قالب عام');
    expect(s.lineItemsCount).toBe(3);
    expect(s.hasWarranty).toBe(true);
    expect(s.hasPayments).toBe(true);
    expect(s.source).toBe('workspace');
  });

  it('2. first-party (provider business) is persisted on creation', () => {
    expect(PAGE).toMatch(/business_id:\s*businessId\s*\|\|\s*null/);
    expect(PAGE).toMatch(/provider_id:\s*vars\?\.overrideProviderUserId\s*\?\?\s*user!\.id/);
  });

  it('3. second-party (client) is persisted on creation', () => {
    expect(PAGE).toMatch(/client_id:\s*clientUserId/);
  });

  it('4. execution site is linked after creation', () => {
    expect(PAGE).toMatch(/setContractExecutionSite\(result\.contractId,\s*selectedSiteId\)/);
  });

  it('5. sector / work type is captured before submission', () => {
    expect(PAGE).toMatch(/sectorId:\s*workTypeTouched \? selectedWorkType : null/);
  });

  it('6. template version is required and passed to the create RPC', () => {
    expect(PAGE).toMatch(/_template_version_id:\s*versionId/);
    expect(PAGE).toContain('No published contract template available');
  });

  it('7. scope / terms / dates persist on the insert payload', () => {
    expect(PAGE).toMatch(/description_ar:\s*effForm\.description_ar/);
    expect(PAGE).toMatch(/terms_ar:\s*effForm\.terms_ar/);
    expect(PAGE).toMatch(/start_date:\s*effForm\.start_date/);
    expect(PAGE).toMatch(/end_date:\s*effForm\.end_date/);
  });

  it('8. payment + VAT fields persist on the insert payload', () => {
    expect(PAGE).toMatch(/total_amount:\s*Number\(effForm\.total_amount\)/);
    expect(PAGE).toMatch(/vat_inclusive:\s*effForm\.vat_inclusive/);
    expect(PAGE).toMatch(/vat_rate:\s*Number\(effForm\.vat_rate\)/);
  });

  it('9. created contract status is always draft', () => {
    expect(PAGE).toMatch(/status:\s*'draft'/);
    expect(WORKSPACE).not.toMatch(/status:\s*'(active|signed|sent|accepted)'/);
  });

  it('10. workspace success toast and ToastAction "view contract" remain intact', () => {
    expect(WORKSPACE).toContain('تم إنشاء العقد بنجاح كمسودة');
    expect(WORKSPACE).toContain('Contract created successfully as a draft');
    expect(WORKSPACE).toMatch(/<ToastAction\b/);
    expect(WORKSPACE).toContain('عرض العقد');
    expect(WORKSPACE).toContain('View contract');
  });

  it('11. no signature / accept / send / activate flows are triggered on creation', () => {
    const code = WORKSPACE + '\n' + SUMMARY_HELPER;
    expect(code).not.toMatch(/\b(signContract|acceptContract|sendContract|activateContract|submitContract)\b/);
  });

  it('12. no new RPC is introduced by the summary helper', () => {
    expect(SUMMARY_HELPER).not.toMatch(/\.rpc\(/);
    expect(SUMMARY_HELPER).not.toMatch(/supabase/i);
  });

  it('13. no DB / RLS / migration / edge references in Phase F files', () => {
    const all = SUMMARY_HELPER + '\n' + PARTIES;
    expect(all).not.toMatch(/supabase\/migrations|CREATE TABLE|CREATE POLICY|service_role/i);
  });

  it('14. no `any` / suppressions in Phase F files', () => {
    const all = SUMMARY_HELPER;
    expect(/:\s*any\b/.test(all)).toBe(false);
    expect(/\bas\s+any\b/.test(all)).toBe(false);
    expect(all.includes('@ts-ignore')).toBe(false);
    expect(all.includes('@ts-expect-error')).toBe(false);
    expect(all.includes('eslint-disable')).toBe(false);
  });

  it('15. DashboardContracts.tsx stays under the page line cap (3192)', () => {
    expect(PAGE.split('\n').length).toBeLessThan(3192);
  });

  it('16. summary defaults to draft + unknown source when nothing is provided', () => {
    const s = buildContractSummary({});
    expect(s.isDraft).toBe(true);
    expect(s.status).toBe('draft');
    expect(s.source).toBe('unknown');
    expect(s.lineItemsCount).toBe(0);
    expect(s.hasWarranty).toBe(false);
    expect(s.hasPayments).toBe(false);
  });
});
