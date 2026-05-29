import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  rankHelpArticles,
  findRelatedArticles,
  computeSmartRecommendations,
  generateHelpAnswer,
  computeHelpIntelligenceMetrics,
  computeContentGaps,
  computeArticleQuality,
  normalizeQuery,
  tokenize,
  correctTypos,
  type HelpArticle,
  type HelpFeatureRequest,
  type HelpIssueReport,
} from '@/modules/helpCenter';

const read = (p: string) => readFileSync(resolve(p), 'utf-8');

const mkArticle = (over: Partial<HelpArticle> = {}): HelpArticle => ({
  id: over.id ?? Math.random().toString(36).slice(2),
  ref_id: over.ref_id ?? 'HELP-X',
  category_id: over.category_id ?? 'cat-1',
  slug: over.slug ?? 'slug',
  audience: over.audience ?? 'general',
  status: over.status ?? 'published',
  title_ar: over.title_ar ?? 'عنوان',
  title_en: over.title_en ?? 'Title',
  summary_ar: over.summary_ar ?? null,
  summary_en: over.summary_en ?? null,
  content_ar: over.content_ar ?? null,
  content_en: over.content_en ?? null,
  keywords: over.keywords ?? [],
  views_count: over.views_count ?? 0,
  helpful_count: over.helpful_count ?? 0,
  not_helpful_count: over.not_helpful_count ?? 0,
  updated_at: over.updated_at ?? new Date().toISOString(),
});

describe('HELP-CENTER-INTELLIGENCE-3', () => {
  describe('text normalization & typo tolerance', () => {
    it('normalizes Arabic variants and English casing', () => {
      expect(normalizeQuery('  العقود  ')).toContain('عقد');
      expect(normalizeQuery('Quotation')).toContain('quote');
      const rfq = normalizeQuery('RFQ');
      expect(rfq).toContain('rfq');
      expect(rfq).toMatch(/request for /);
    });
    it('tokenizes with stopwords removed and stems', () => {
      const tokens = tokenize(normalizeQuery('how to create contracts'));
      expect(tokens).toContain('contract');
      expect(tokens).not.toContain('to');
      expect(tokens).not.toContain('how');
    });
    it('corrects single-edit typos against a vocab', () => {
      const out = correctTypos('contrats', ['contract']);
      expect(out).toContain('contract');
    });
  });

  describe('ranking & related', () => {
    it('boosts page-context articles', () => {
      const arts = [
        mkArticle({ id: '1', slug: 'what-is-wo', title_en: 'Work order basics' }),
        mkArticle({ id: '2', slug: 'random', title_en: 'Random article', views_count: 1000 }),
      ];
      const r = rankHelpArticles({ articles: arts, pageKey: 'dashboard.work-orders' });
      expect(r[0].article.slug).toBe('what-is-wo');
    });
    it('keyword match boosts ranking', () => {
      const arts = [
        mkArticle({ id: '1', slug: 'a', title_en: 'Boiler plate' }),
        mkArticle({ id: '2', slug: 'b', title_en: 'How to create RFQ', keywords: ['rfq'] }),
      ];
      const r = rankHelpArticles({ articles: arts, searchQuery: 'rfq' });
      expect(r[0].article.slug).toBe('b');
    });
    it('findRelatedArticles excludes the article itself', () => {
      const target = mkArticle({ id: 't', slug: 't', keywords: ['quote'] });
      const pool = [target, mkArticle({ id: 'o', slug: 'o', keywords: ['quote'] })];
      const rel = findRelatedArticles(target, pool, 5);
      expect(rel.find((r) => r.id === 't')).toBeUndefined();
      expect(rel[0]?.id).toBe('o');
    });
  });

  describe('smart recommendations', () => {
    it('returns 4 lists with no overlap-by-section guarantee', () => {
      const arts = [
        mkArticle({ id: '1', slug: 'what-is-wo', helpful_count: 10, not_helpful_count: 0, views_count: 50 }),
        mkArticle({ id: '2', slug: 'other', views_count: 200 }),
      ];
      const rec = computeSmartRecommendations({ articles: arts, pageKey: 'dashboard.work-orders', recentlyViewedSlugs: ['other'] });
      expect(rec.pageSpecific[0].slug).toBe('what-is-wo');
      expect(rec.mostHelpful.length).toBeGreaterThan(0);
      expect(rec.recentlyViewed[0]?.slug).toBe('other');
    });
  });

  describe('AI answers — grounded only', () => {
    it('returns low_confidence when nothing matches', () => {
      const ans = generateHelpAnswer({ question: 'xyzqwerty', articles: [mkArticle({ title_en: 'A', content_en: 'A content' })] });
      expect(ans.status).toBe('low_confidence');
      expect(ans.sources).toEqual([]);
      expect(ans.answer.toLowerCase()).toMatch(/couldn'?t|find|لم/);
    });
    it('answers from a matching article and cites it', () => {
      const a = mkArticle({
        slug: 'rfq-guide',
        title_en: 'How to create an RFQ',
        content_en: 'An RFQ is a request for quotation. To create one, open Procurement and click New RFQ. Add items and suppliers.',
        keywords: ['rfq', 'procurement'],
      });
      const ans = generateHelpAnswer({ question: 'How to create an RFQ?', articles: [a] });
      expect(ans.status).toBe('answered');
      expect(ans.sources[0]?.slug).toBe('rfq-guide');
      expect(ans.answer.toLowerCase()).toContain('rfq');
    });
    it('never invents sources beyond the provided articles', () => {
      const a = mkArticle({ slug: 'only-one', title_en: 'Only one', content_en: 'content here', keywords: ['only'] });
      const ans = generateHelpAnswer({ question: 'only', articles: [a] });
      for (const s of ans.sources) {
        expect(s.slug).toBe('only-one');
      }
    });
  });

  describe('analytics & content gaps & quality', () => {
    it('computeHelpIntelligenceMetrics aggregates searches and articles', () => {
      const arts = [mkArticle({ slug: 'a', helpful_count: 8, not_helpful_count: 2, views_count: 100 })];
      const logs = [
        { query: 'rfq', results_count: 5 },
        { query: 'rfq', results_count: 5 },
        { query: 'xyzgap', results_count: 0 },
        { query: 'xyzgap', results_count: 0 },
        { query: 'xyzgap', results_count: 0 },
      ];
      const m = computeHelpIntelligenceMetrics(arts, [], [], logs);
      expect(m.topSearched[0].count).toBeGreaterThanOrEqual(2);
      expect(m.zeroResultSearches.find((z) => z.term.includes('xyzgap'))?.count).toBe(3);
      expect(m.topHelpfulArticles[0].slug).toBe('a');
    });
    it('computeContentGaps surfaces high-frequency low-result queries', () => {
      const logs = Array.from({ length: 5 }, () => ({ query: 'missing topic', results_count: 0 }));
      const gaps = computeContentGaps(logs, { minFrequency: 3, maxAvgResults: 0 });
      expect(gaps.length).toBe(1);
      expect(gaps[0].suggestedTitle).toMatch(/Guide|دليل/);
    });
    it('computeArticleQuality penalises missing fields', () => {
      const minimal = mkArticle({ content_en: null, content_ar: null, summary_en: null, summary_ar: null, keywords: [] });
      const rich = mkArticle({
        content_en: 'x'.repeat(200), content_ar: 'ع'.repeat(200),
        summary_en: 'sum', summary_ar: 'ملخص',
        keywords: ['a', 'b', 'c'], helpful_count: 5, not_helpful_count: 0, views_count: 100,
      });
      expect(computeArticleQuality(minimal).score).toBeLessThan(computeArticleQuality(rich).score);
      expect(computeArticleQuality(rich).score).toBeGreaterThanOrEqual(80);
    });
  });

  describe('safety: source-code constraints', () => {
    const intelDir = 'src/modules/helpCenter/intelligence';
    const files = ['textNormalize.ts', 'ranking.ts', 'recommendations.ts', 'aiAnswers.ts', 'analytics.ts', 'searchLogs.ts', 'index.ts'];
    const blobs = Object.fromEntries(files.map((f) => [f, read(`${intelDir}/${f}`)]));
    const allCode = Object.values(blobs).join('\n');

    it('only searchLogs.ts touches the database; pure helpers never do', () => {
      for (const [f, code] of Object.entries(blobs)) {
        if (f === 'searchLogs.ts' || f === 'index.ts') continue;
        expect(code, `${f} should be pure`).not.toMatch(/supabase\.from\(/);
        expect(code, `${f} should not use fetch`).not.toMatch(/\bfetch\(/);
      }
    });
    it('AI answer logic does not reference private domains', () => {
      const banned = ['contracts', 'work_orders', 'businesses', 'rfqs', 'profiles', 'customers', 'staff', 'inventory', 'accounting'];
      for (const b of banned) {
        expect(blobs['aiAnswers.ts'].toLowerCase()).not.toContain(`from('${b}')`);
      }
    });
    it('intelligence layer does not import out-of-scope modules', () => {
      for (const bad of ['@/modules/contracts', '@/modules/businesses', '@/modules/workOrders', '@/modules/procurement', '@/modules/customerTracking']) {
        expect(allCode).not.toContain(bad);
      }
    });
    it('SmartHelpPanel uses wrappers only', () => {
      const panel = read('src/components/help/SmartHelpPanel.tsx');
      expect(panel).not.toMatch(/supabase\.from\(/);
      expect(panel).toMatch(/from '@\/modules\/helpCenter'/);
    });
    it('HelpLauncher now renders SmartHelpPanel', () => {
      const launcher = read('src/components/help/HelpLauncher.tsx');
      expect(launcher).toMatch(/SmartHelpPanel/);
    });
    it('HelpCenterHome logs searches via wrapper', () => {
      const home = read('src/pages/help/HelpCenterHome.tsx');
      expect(home).toMatch(/logHelpSearch/);
      expect(home).not.toMatch(/supabase\.from\('help_search_logs'\)/);
    });
    it('HelpArticlePage shows related articles + records recent', () => {
      const page = read('src/pages/help/HelpArticlePage.tsx');
      expect(page).toMatch(/findRelatedArticles/);
      expect(page).toMatch(/pushRecentlyViewedSlug/);
    });
    it('admin help center surfaces intelligence metrics', () => {
      const admin = read('src/pages/admin/AdminHelpCenter.tsx');
      expect(admin).toMatch(/computeHelpIntelligenceMetrics/);
      expect(admin).toMatch(/computeContentGaps/);
      expect(admin).toMatch(/computeArticleQuality/);
      expect(admin).toMatch(/adminListSearchLogs/);
    });
    it('no scope creep in intelligence layer', () => {
      const code = allCode.toLowerCase();
      for (const bad of ['inventory', 'accounting', 'supplier portal', 'whatsapp', '/sms']) {
        expect(code).not.toContain(bad);
      }
    });
  });

  describe('logHelpSearch swallows errors (analytics-only)', () => {
    it('does not throw when DB call fails', async () => {
      const { logHelpSearch } = await import('@/modules/helpCenter/intelligence/searchLogs');
      vi.spyOn(console, 'error').mockImplementation(() => {});
      await expect(logHelpSearch({ query: 'test', results_count: 0 })).resolves.toBeUndefined();
    });
  });
});