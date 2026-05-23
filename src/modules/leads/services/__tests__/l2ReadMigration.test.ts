import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(p: string): string {
  return readFileSync(resolve(process.cwd(), p), 'utf8');
}

describe('L-2 read callsite migration', () => {
  it('AdminDashboardView uses lead count services (no direct lead_requests reads)', () => {
    const src = read('src/pages/dashboard/overview/AdminDashboardView.tsx');
    expect(src).not.toMatch(/from\(\s*['"]lead_requests['"]\s*\)/);
    expect(src).toContain('countLeadsByDateRange(todayIso)');
    expect(src).toContain("countLeadsByStatus('new')");
  });

  it('ProviderTipsCard uses countLeadsForBusiness', () => {
    const src = read('src/components/dashboard/ProviderTipsCard.tsx');
    expect(src).not.toMatch(/from\(\s*['"]lead_requests['"]\s*\)/);
    expect(src).toContain('countLeadsForBusiness(businessId!)');
  });

  it('ProviderLeadAnalytics uses listLeadAnalyticsForBusiness and preserves error wrap', () => {
    const src = read('src/components/dashboard/ProviderLeadAnalytics.tsx');
    expect(src).not.toMatch(/from\(\s*['"]lead_requests['"]\s*\)/);
    expect(src).toContain('listLeadAnalyticsForBusiness(');
    expect(src).toContain("'lead_analytics_fetch_failed'");
    expect(src).toContain("queryKey: ['provider-lead-analytics', businessId, period]");
  });

  it('ProviderEngagementPreviews uses listRecentLeadsForBusiness', () => {
    const src = read('src/components/dashboard/ProviderEngagementPreviews.tsx');
    expect(src).not.toMatch(/from\(\s*['"]lead_requests['"]\s*\)/);
    expect(src).toContain('listRecentLeadsForBusiness(businessId!)');
    expect(src).toContain("queryKey: ['provider-recent-leads', businessId]");
  });
});