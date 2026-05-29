import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

describe('HELP-CENTER-ADMIN-2', () => {
  const app = read('src/App.tsx');
  const sitemap = read('supabase/functions/sitemap/index.ts');
  const adminPage = read('src/pages/admin/AdminHelpCenter.tsx');
  const dashPage = read('src/pages/dashboard/DashboardHelpCenter.tsx');
  const floating = read('src/components/help/HelpLauncherFloating.tsx');
  const reportPage = read('src/pages/help/ReportIssuePage.tsx');
  const featurePage = read('src/pages/help/FeatureRequestPage.tsx');

  it('registers /admin/help with admin guard', () => {
    expect(app).toMatch(/\/admin\/help/);
    expect(app).toMatch(/AdminHelpCenter/);
    const line = app.split('\n').find((l) => l.includes('/admin/help'));
    expect(line ?? '').toMatch(/requireAdmin/);
  });

  it('registers /dashboard/help', () => {
    expect(app).toMatch(/\/dashboard\/help/);
    expect(app).toMatch(/DashboardHelpCenter/);
  });

  it('sitemap function includes /help', () => {
    expect(sitemap).toMatch(/loc:\s*["']\/help["']/);
  });

  it('admin & dashboard help pages have no direct supabase.from', () => {
    expect(adminPage).not.toMatch(/supabase\.from\(/);
    expect(dashPage).not.toMatch(/supabase\.from\(/);
  });

  it('admin page uses wrappers + computeHelpMetrics', () => {
    expect(adminPage).toMatch(/from '@\/modules\/helpCenter'/);
    expect(adminPage).toMatch(/computeHelpMetrics/);
    expect(adminPage).toMatch(/publishHelpArticle|unpublishHelpArticle/);
    expect(adminPage).toMatch(/updateHelpIssueReportStatus/);
    expect(adminPage).toMatch(/updateHelpFeatureRequestStatus/);
    expect(adminPage).toMatch(/updateHelpCategory/);
  });

  it('dashboard page uses wrappers', () => {
    expect(dashPage).toMatch(/from '@\/modules\/helpCenter'/);
    expect(dashPage).toMatch(/listMyIssueReports/);
    expect(dashPage).toMatch(/listMyFeatureRequests/);
  });

  it('HelpLauncherFloating mounted in App + covers required pages', () => {
    expect(app).toMatch(/<HelpLauncherFloating/);
    const required = [
      'dashboard.work-orders', 'dashboard.work-order-detail', 'dashboard.production-board',
      'dashboard.procurement', 'dashboard.procurement-detail', 'dashboard.contracts',
      'dashboard.contract-detail', 'dashboard.business-profile', 'dashboard.staff',
      'dashboard.operations-center',
      'admin.identity', 'admin.provider-review', 'admin.operations-center',
      'customer.portal',
    ];
    for (const k of required) {
      expect(floating).toContain(k);
    }
  });

  it('issue + feature lifecycles exposed via wrappers', () => {
    const issues = read('src/modules/helpCenter/issueReports.ts');
    const features = read('src/modules/helpCenter/featureRequests.ts');
    expect(issues).toMatch(/listHelpIssueReports/);
    expect(issues).toMatch(/updateHelpIssueReportStatus/);
    expect(features).toMatch(/listHelpFeatureRequests/);
    expect(features).toMatch(/updateHelpFeatureRequestStatus/);
    const types = read('src/modules/helpCenter/types.ts');
    for (const s of ['open', 'reviewing', 'planned', 'resolved', 'closed']) expect(types).toContain(`'${s}'`);
    for (const s of ['new', 'reviewing', 'planned', 'in_progress', 'completed', 'rejected']) expect(types).toContain(`'${s}'`);
  });

  it('article publish wrappers exist', () => {
    const articles = read('src/modules/helpCenter/articles.ts');
    expect(articles).toMatch(/publishHelpArticle/);
    expect(articles).toMatch(/unpublishHelpArticle/);
    expect(articles).toMatch(/updateHelpArticle/);
  });

  it('report + feature pages remain noindex', () => {
    expect(reportPage).toMatch(/useNoIndex/);
    expect(featurePage).toMatch(/useNoIndex/);
  });

  it('no out-of-scope domain references in help surfaces', () => {
    const blob = [adminPage, dashPage, floating].join('\n').toLowerCase();
    for (const bad of ['inventory', 'accounting', 'supplier-portal', 'supplier portal', 'whatsapp', '/sms']) {
      expect(blob).not.toContain(bad);
    }
  });

  it('admin page uses ref_id labels, not raw UUID columns', () => {
    expect(adminPage).toMatch(/ref_id/);
    expect(adminPage).not.toMatch(/\bid as primary\b/i);
  });
});