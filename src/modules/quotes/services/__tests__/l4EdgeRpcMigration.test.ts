import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(p: string): string {
  return readFileSync(resolve(process.cwd(), p), 'utf8');
}

describe('L-4: RPC + edge wrapper migration', () => {
  const ADMIN = read('src/pages/admin/AdminQuoteRequestDetails.tsx');
  const DASH = read('src/pages/dashboard/DashboardContracts.tsx');
  const DET = read('src/pages/ContractDetail.tsx');

  it('AdminQuoteRequestDetails: no direct edge invokes for migrated functions', () => {
    expect(ADMIN).not.toMatch(/supabase\.functions\.invoke\(\s*['"]admin-reveal-lead-contact['"]/);
    expect(ADMIN).not.toMatch(/supabase\.functions\.invoke\(\s*['"]match-quote-request['"]/);
  });

  it('AdminQuoteRequestDetails: imports + uses wrappers', () => {
    expect(ADMIN).toMatch(/adminRevealLeadContact/);
    expect(ADMIN).toMatch(/matchQuoteRequest\s*\(/);
    expect(ADMIN).toMatch(/adminRevealLeadContact\(\s*\{[\s\S]*?lead_id:\s*vars\.lead_id[\s\S]*?note:\s*vars\.note\s*\|\|\s*undefined[\s\S]*?override_credit_check:\s*vars\.override_credit_check\s*\|\|\s*undefined/);
    expect(ADMIN).toMatch(/matchQuoteRequest\(\s*\{\s*quote_request_id:\s*id,\s*limit:\s*10\s*\}\s*\)/);
  });

  it('AdminQuoteRequestDetails: preserves { error } throw and toast handlers', () => {
    expect(ADMIN).toMatch(/const\s*\{\s*data,\s*error\s*\}\s*=\s*await\s+adminRevealLeadContact\(/);
    expect(ADMIN).toMatch(/const\s*\{\s*data,\s*error\s*\}\s*=\s*await\s+matchQuoteRequest\(/);
    expect(ADMIN).toMatch(/if\s*\(error\)\s*throw\s+error/);
    expect(ADMIN).toMatch(/onError:\s*\(\)\s*=>\s*toast\.error\('تعذر إتاحة بيانات التواصل'\)/);
    expect(ADMIN).toMatch(/onError:\s*\(\)\s*=>\s*toast\.error\('تعذر تشغيل عملية التوجيه'\)/);
  });

  it('DashboardContracts: no direct prepare_contract_prefill_from_lead rpc, uses wrapper', () => {
    expect(DASH).not.toMatch(/supabase\.rpc\(\s*['"]prepare_contract_prefill_from_lead['"]/);
    expect(DASH).toMatch(/prepareContractPrefillFromLead\(\s*\{\s*_lead_id:\s*leadId\s*\}\s*\)/);
    // Error-code parsing preserved verbatim
    expect(DASH).toMatch(/LEAD_PREFILL:UNAUTHENTICATED/);
    expect(DASH).toMatch(/LEAD_PREFILL:NOT_FOUND/);
    expect(DASH).toMatch(/LEAD_PREFILL:DEMO_LEAD/);
    expect(DASH).toMatch(/LEAD_PREFILL:FORBIDDEN/);
  });

  it('ContractDetail: no direct get_contract_source_lead_summary rpc, uses wrapper', () => {
    expect(DET).not.toMatch(/supabase\.rpc\(\s*['"]get_contract_source_lead_summary['"]/);
    expect(DET).toMatch(/getContractSourceLeadSummary\(\s*\{\s*_contract_id:\s*contractId,?\s*\}\s*\)/);
    expect(DET).toMatch(/if\s*\(error\)\s*return\s+null/);
  });

  it('app code holds zero direct lead/quote table reads or mutations', () => {
    for (const src of [ADMIN, DASH, DET]) {
      expect(src).not.toMatch(/supabase\.from\(\s*['"]quote_requests['"]\s*\)\s*\.\s*(select|insert|update|delete|upsert)/);
      expect(src).not.toMatch(/supabase\.from\(\s*['"]quote_request_events['"]\s*\)\s*\.\s*(select|insert|update|delete|upsert)/);
      expect(src).not.toMatch(/supabase\.from\(\s*['"]lead_requests['"]\s*\)\s*\.\s*(select|insert|update|delete|upsert)/);
    }
  });
});