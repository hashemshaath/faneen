import { describe, expect, it } from 'vitest';
import { computeHelpMetrics, contextualHelpRegistry, getContextualArticles } from '@/modules/helpCenter';
import type { HelpArticle, HelpFeatureRequest, HelpIssueReport } from '@/modules/helpCenter';

describe('Help Center Foundation 1', () => {
  it('contextual registry maps key pages', () => {
    expect(Object.keys(contextualHelpRegistry).length).toBeGreaterThan(10);
    expect(getContextualArticles('dashboard.work-orders')).toContain('what-is-wo');
    expect(getContextualArticles('dashboard.procurement')).toContain('what-is-rfq');
    expect(getContextualArticles('dashboard.contracts')).toContain('contract-lifecycle');
    expect(getContextualArticles('customer.portal')).toContain('tracking-link');
    expect(getContextualArticles('admin.identity')).toContain('identity-overview');
    expect(getContextualArticles('nonexistent')).toEqual([]);
  });

  it('computeHelpMetrics handles empty input', () => {
    const m = computeHelpMetrics([], [], []);
    expect(m.totalArticles).toBe(0);
    expect(m.helpfulRatio).toBe(0);
  });

  it('computeHelpMetrics aggregates', () => {
    const a: HelpArticle[] = [
      { id: 'a1', ref_id: 'HELP-1', category_id: null, slug: 's1', audience: 'general', status: 'published', title_ar: 'أ', title_en: 'A', summary_ar: null, summary_en: null, content_ar: null, content_en: null, keywords: [], views_count: 10, helpful_count: 7, not_helpful_count: 3, updated_at: '2026-01-01' },
      { id: 'a2', ref_id: 'HELP-2', category_id: null, slug: 's2', audience: 'general', status: 'published', title_ar: 'ب', title_en: 'B', summary_ar: null, summary_en: null, content_ar: null, content_en: null, keywords: [], views_count: 5, helpful_count: 0, not_helpful_count: 0, updated_at: '2026-01-01' },
    ];
    const i: HelpIssueReport[] = [
      { id: 'i1', ref_id: 'ISS-1', page_key: null, issue_type: 'bug', priority: 'high', title: 't', description: null, screenshot_url: null, status: 'open', created_at: '2026-01-01' },
      { id: 'i2', ref_id: 'ISS-2', page_key: null, issue_type: 'bug', priority: 'low', title: 't', description: null, screenshot_url: null, status: 'resolved', created_at: '2026-01-01' },
    ];
    const r: HelpFeatureRequest[] = [
      { id: 'r1', ref_id: 'REQ-1', category: null, title: 't', description: null, votes_count: 0, status: 'new', created_at: '2026-01-01' },
    ];
    const m = computeHelpMetrics(a, i, r, ['boq', 'BOQ', 'rfq']);
    expect(m.totalArticles).toBe(2);
    expect(m.totalViews).toBe(15);
    expect(m.helpfulRatio).toBeCloseTo(0.7);
    expect(m.openIssues).toBe(1);
    expect(m.resolvedIssues).toBe(1);
    expect(m.topViewed[0].slug).toBe('s1');
    expect(m.topSearchedTopics[0]).toEqual({ term: 'boq', count: 2 });
    expect(m.issuesByPriority.high).toBe(1);
    expect(m.totalFeatureRequests).toBe(1);
  });

  it('no out-of-scope topics referenced', () => {
    const keys = Object.keys(contextualHelpRegistry).join(' ').toLowerCase();
    for (const bad of ['inventory', 'accounting', 'supplier-portal', 'whatsapp', 'sms']) {
      expect(keys).not.toContain(bad);
    }
  });
});