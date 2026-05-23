import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(p: string): string {
  return readFileSync(resolve(process.cwd(), p), 'utf8');
}

describe('L-2 admin quote read callsite migration', () => {
  it('AdminQuoteRequestDetails: no direct quote_request* reads, uses services', () => {
    const src = read('src/pages/admin/AdminQuoteRequestDetails.tsx');
    // No direct reads (selects) of the quote tables. Inserts are deferred to L-3.
    expect(src).not.toMatch(/from\(\s*['"]quote_requests['"]\s*\)\s*\n?\s*\.select/);
    expect(src).not.toMatch(/from\(\s*['"]quote_request_files['"]\s*\)/);
    expect(src).not.toMatch(/from\(\s*['"]quote_request_leads['"]\s*\)\s*\n?\s*\.select/);
    expect(src).not.toMatch(/from\(\s*['"]quote_request_events['"]\s*\)\s*\n?\s*\.select/);
    expect(src).not.toMatch(/from\(\s*['"]quote_request_lead_events['"]\s*\)/);
    expect(src).toContain('getAdminQuoteRequestById<AdminQuoteRow>(id!)');
    expect(src).toContain('listAdminQuoteRequestFiles(id!)');
    expect(src).toContain('listAdminQuoteRequestLeads<LeadSummaryRow>(id!)');
    expect(src).toContain('listAdminQuoteRequestEvents(id!)');
    expect(src).toContain('listAdminQuoteRequestLeadEvents');
    // L-3: direct quote_request_events insert migrated to service.
    expect(src).not.toContain("supabase.from('quote_request_events').insert(");
    // L-4: direct edge invokes migrated to service wrappers.
    expect(src).not.toContain("supabase.functions.invoke('admin-reveal-lead-contact'");
    expect(src).not.toContain("supabase.functions.invoke('match-quote-request'");
    // Query keys preserved
    expect(src).toContain("queryKey: ['admin-quote-request', id]");
    expect(src).toContain("queryKey: ['admin-quote-files', id]");
    expect(src).toContain("queryKey: ['admin-quote-leads', id]");
    expect(src).toContain("queryKey: ['admin-quote-events', id]");
  });

  it('AdminQuoteOperations: no direct quote_request* reads, uses services', () => {
    const src = read('src/pages/admin/AdminQuoteOperations.tsx');
    expect(src).not.toMatch(/from\(\s*['"]quote_requests['"]\s*\)/);
    expect(src).not.toMatch(/from\(\s*['"]quote_request_leads['"]\s*\)/);
    expect(src).not.toMatch(/from\(\s*['"]quote_request_events['"]\s*\)/);
    expect(src).not.toMatch(/from\(\s*['"]quote_request_lead_events['"]\s*\)/);
    expect(src).toContain('listAdminOpsQuoteRequests({ fromDateIso, sector })');
    expect(src).toContain('listAdminOpsQuoteRequestLeads<LeadRow>(quoteIds)');
    expect(src).toContain('listAdminOpsQuoteRequestEvents(quoteIds)');
    expect(src).toContain('listAdminOpsQuoteRequestLeadEvents(quoteIds)');
    expect(src).not.toContain("from '@/integrations/supabase/client'");
    expect(src).toContain("queryKey: ['admin-ops-quotes', fromDateIso, sector]");
    expect(src).toContain("queryKey: ['admin-ops-leads', quoteIds]");
    expect(src).toContain("queryKey: ['admin-ops-quote-events', quoteIds]");
    expect(src).toContain("queryKey: ['admin-ops-lead-events', quoteIds]");
  });

  it('Completed lead/quote pages remain clean', () => {
    const pages = [
      'src/pages/Quote.tsx',
      'src/pages/admin/AdminLeadRequests.tsx',
      'src/pages/dashboard/DashboardLeads.tsx',
      'src/pages/dashboard/DashboardMyRequests.tsx',
    ];
    for (const p of pages) {
      const src = read(p);
      expect(src, p).not.toMatch(/supabase\.from\(\s*['"]lead_requests['"]/);
      expect(src, p).not.toMatch(/supabase\.from\(\s*['"]quote_requests['"]/);
      expect(src, p).not.toMatch(/supabase\.from\(\s*['"]quote_request_files['"]/);
    }
  });
});