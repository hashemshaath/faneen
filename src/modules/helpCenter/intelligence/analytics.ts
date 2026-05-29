import type { HelpArticle, HelpFeatureRequest, HelpIssueReport } from '../types';
import { normalizeQuery } from './textNormalize';

export interface SearchLogRowLite {
  query: string;
  query_normalized?: string | null;
  results_count: number;
  selected_article_id?: string | null;
  created_at?: string;
}

export interface HelpIntelligenceMetrics {
  topSearched: Array<{ term: string; count: number }>;
  zeroResultSearches: Array<{ term: string; count: number }>;
  topViewedArticles: Array<{ slug: string; title_en: string; title_ar: string; views_count: number }>;
  topHelpfulArticles: Array<{ slug: string; title_en: string; title_ar: string; ratio: number; votes: number }>;
  leastHelpfulArticles: Array<{ slug: string; title_en: string; title_ar: string; ratio: number; votes: number }>;
  mostRequestedFeatures: Array<{ title: string; votes: number; status: string }>;
  mostReportedIssues: Array<{ title: string; priority: string; status: string }>;
}

export function computeHelpIntelligenceMetrics(
  articles: HelpArticle[],
  issues: HelpIssueReport[],
  requests: HelpFeatureRequest[],
  searchLogs: SearchLogRowLite[],
): HelpIntelligenceMetrics {
  const termCounts = new Map<string, number>();
  const zeroCounts = new Map<string, number>();
  for (const row of searchLogs) {
    const term = (row.query_normalized || normalizeQuery(row.query || '')).trim();
    if (!term) continue;
    termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
    if ((row.results_count ?? 0) === 0) {
      zeroCounts.set(term, (zeroCounts.get(term) ?? 0) + 1);
    }
  }

  const topSearched = [...termCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([term, count]) => ({ term, count }));
  const zeroResultSearches = [...zeroCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([term, count]) => ({ term, count }));

  const topViewedArticles = [...articles]
    .sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0))
    .slice(0, 10)
    .map((a) => ({ slug: a.slug, title_en: a.title_en, title_ar: a.title_ar, views_count: a.views_count }));

  const withVotes = articles
    .map((a) => {
      const votes = (a.helpful_count ?? 0) + (a.not_helpful_count ?? 0);
      const ratio = votes > 0 ? (a.helpful_count ?? 0) / votes : 0;
      return { a, votes, ratio };
    })
    .filter((x) => x.votes > 0);

  const topHelpfulArticles = [...withVotes].sort((x, y) => y.ratio - x.ratio || y.votes - x.votes).slice(0, 10)
    .map(({ a, ratio, votes }) => ({ slug: a.slug, title_en: a.title_en, title_ar: a.title_ar, ratio, votes }));
  const leastHelpfulArticles = [...withVotes].sort((x, y) => x.ratio - y.ratio || y.votes - x.votes).slice(0, 10)
    .map(({ a, ratio, votes }) => ({ slug: a.slug, title_en: a.title_en, title_ar: a.title_ar, ratio, votes }));

  const mostRequestedFeatures = [...requests]
    .sort((a, b) => (b.votes_count ?? 0) - (a.votes_count ?? 0))
    .slice(0, 10)
    .map((r) => ({ title: r.title, votes: r.votes_count ?? 0, status: r.status }));

  const priorityWeight: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  const mostReportedIssues = [...issues]
    .sort((a, b) => (priorityWeight[b.priority] ?? 0) - (priorityWeight[a.priority] ?? 0))
    .slice(0, 10)
    .map((i) => ({ title: i.title, priority: i.priority, status: i.status }));

  return {
    topSearched,
    zeroResultSearches,
    topViewedArticles,
    topHelpfulArticles,
    leastHelpfulArticles,
    mostRequestedFeatures,
    mostReportedIssues,
  };
}

export interface ContentGap {
  term: string;
  frequency: number;
  avgResults: number;
  suggestedTitle: string;
}

export function computeContentGaps(searchLogs: SearchLogRowLite[], opts: { minFrequency?: number; maxAvgResults?: number; limit?: number } = {}): ContentGap[] {
  const minFrequency = opts.minFrequency ?? 3;
  const maxAvgResults = opts.maxAvgResults ?? 1;
  const limit = opts.limit ?? 10;

  const acc = new Map<string, { count: number; totalResults: number }>();
  for (const row of searchLogs) {
    const term = (row.query_normalized || normalizeQuery(row.query || '')).trim();
    if (!term) continue;
    const cur = acc.get(term) ?? { count: 0, totalResults: 0 };
    cur.count += 1;
    cur.totalResults += row.results_count ?? 0;
    acc.set(term, cur);
  }

  return [...acc.entries()]
    .map(([term, v]) => ({ term, frequency: v.count, avgResults: v.totalResults / v.count, suggestedTitle: suggestTitle(term) }))
    .filter((g) => g.frequency >= minFrequency && g.avgResults <= maxAvgResults)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);
}

function suggestTitle(term: string): string {
  const t = term.trim();
  if (!t) return '';
  // If ASCII → English title case suggestion
  if (/^[\x00-\x7F]+$/.test(t)) return `Guide: ${t.replace(/\b\w/g, (c) => c.toUpperCase())}`;
  return `دليل: ${t}`;
}

export interface ArticleQualityScore {
  slug: string;
  score: number; // 0..100
  missing: string[];
}

export function computeArticleQuality(article: HelpArticle): ArticleQualityScore {
  const missing: string[] = [];
  let score = 0;
  if (article.title_ar && article.title_en) score += 15; else missing.push('title');
  if (article.summary_ar && article.summary_en) score += 15; else missing.push('summary');
  if (article.content_ar && article.content_ar.length > 80) score += 20; else missing.push('content_ar');
  if (article.content_en && article.content_en.length > 80) score += 20; else missing.push('content_en');
  if (article.keywords && article.keywords.length >= 3) score += 10; else missing.push('keywords');

  const votes = (article.helpful_count ?? 0) + (article.not_helpful_count ?? 0);
  if (votes > 0) {
    const ratio = (article.helpful_count ?? 0) / votes;
    score += Math.round(ratio * 10);
  }
  // Views give up to +10
  score += Math.min(10, Math.round(Math.log1p(article.views_count ?? 0) * 3));

  return { slug: article.slug, score: Math.max(0, Math.min(100, score)), missing };
}