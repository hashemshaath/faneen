import type { HelpArticle, HelpFeatureRequest, HelpIssueReport } from './types';

export interface HelpMetrics {
  totalArticles: number;
  totalViews: number;
  totalHelpful: number;
  totalNotHelpful: number;
  helpfulRatio: number;
  topViewed: Array<{ slug: string; title_en: string; title_ar: string; views_count: number }>;
  openIssues: number;
  resolvedIssues: number;
  issuesByPriority: Record<string, number>;
  totalFeatureRequests: number;
  requestsByStatus: Record<string, number>;
  topSearchedTopics: Array<{ term: string; count: number }>;
}

/**
 * Pure function: compute help center metrics from raw rows.
 * Stateless; safe to call from any context.
 */
export function computeHelpMetrics(
  articles: HelpArticle[],
  issues: HelpIssueReport[],
  requests: HelpFeatureRequest[],
  searchLog: string[] = [],
): HelpMetrics {
  const totalViews = articles.reduce((s, a) => s + (a.views_count ?? 0), 0);
  const totalHelpful = articles.reduce((s, a) => s + (a.helpful_count ?? 0), 0);
  const totalNotHelpful = articles.reduce((s, a) => s + (a.not_helpful_count ?? 0), 0);
  const helpfulRatio = totalHelpful + totalNotHelpful > 0
    ? totalHelpful / (totalHelpful + totalNotHelpful)
    : 0;

  const topViewed = [...articles]
    .sort((a, b) => (b.views_count ?? 0) - (a.views_count ?? 0))
    .slice(0, 5)
    .map((a) => ({ slug: a.slug, title_en: a.title_en, title_ar: a.title_ar, views_count: a.views_count }));

  const issuesByPriority: Record<string, number> = {};
  for (const i of issues) {
    issuesByPriority[i.priority] = (issuesByPriority[i.priority] ?? 0) + 1;
  }
  const openIssues = issues.filter((i) => i.status === 'open' || i.status === 'reviewing' || i.status === 'planned').length;
  const resolvedIssues = issues.filter((i) => i.status === 'resolved' || i.status === 'closed').length;

  const requestsByStatus: Record<string, number> = {};
  for (const r of requests) {
    requestsByStatus[r.status] = (requestsByStatus[r.status] ?? 0) + 1;
  }

  const termCounts = new Map<string, number>();
  for (const t of searchLog) {
    const k = t.trim().toLowerCase();
    if (!k) continue;
    termCounts.set(k, (termCounts.get(k) ?? 0) + 1);
  }
  const topSearchedTopics = [...termCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([term, count]) => ({ term, count }));

  return {
    totalArticles: articles.length,
    totalViews,
    totalHelpful,
    totalNotHelpful,
    helpfulRatio,
    topViewed,
    openIssues,
    resolvedIssues,
    issuesByPriority,
    totalFeatureRequests: requests.length,
    requestsByStatus,
    topSearchedTopics,
  };
}