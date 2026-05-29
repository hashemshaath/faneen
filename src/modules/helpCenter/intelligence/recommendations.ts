import type { HelpArticle, HelpAudience } from '../types';
import { rankHelpArticles, findRelatedArticles } from './ranking';
import { getContextualArticles } from '../contextualHelp';

export interface SmartRecommendationsInput {
  articles: HelpArticle[];
  pageKey?: string | null;
  audience?: HelpAudience | null;
  recentlyViewedSlugs?: string[];
  limit?: number;
}

export interface SmartRecommendations {
  pageSpecific: HelpArticle[];
  mostHelpful: HelpArticle[];
  related: HelpArticle[];
  recentlyViewed: HelpArticle[];
}

/**
 * Pure helper. Computes the 4 lists rendered by <SmartHelpPanel />.
 * No DB / network calls.
 */
export function computeSmartRecommendations(input: SmartRecommendationsInput): SmartRecommendations {
  const limit = input.limit ?? 4;
  const pool = input.articles.filter((a) => a.status === 'published');
  const contextSlugs = new Set(input.pageKey ? getContextualArticles(input.pageKey) : []);

  const pageSpecific = contextSlugs.size > 0
    ? pool.filter((a) => contextSlugs.has(a.slug)).slice(0, limit)
    : rankHelpArticles({ articles: pool, audience: input.audience, limit }).map((r) => r.article);

  const mostHelpful = [...pool]
    .map((a) => {
      const votes = (a.helpful_count ?? 0) + (a.not_helpful_count ?? 0);
      const ratio = votes > 0 ? (a.helpful_count ?? 0) / votes : 0;
      return { a, score: ratio * 100 + Math.log1p(a.views_count ?? 0) };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.a);

  const seed = pageSpecific[0];
  const related = seed ? findRelatedArticles(seed, pool, limit) : [];

  const recentSet = new Set(input.recentlyViewedSlugs ?? []);
  const recentlyViewed = (input.recentlyViewedSlugs ?? [])
    .map((slug) => pool.find((a) => a.slug === slug))
    .filter((a): a is HelpArticle => Boolean(a) && recentSet.has(a!.slug))
    .slice(0, limit);

  return { pageSpecific, mostHelpful, related, recentlyViewed };
}

const RECENT_KEY = 'qitaat_help_recent_slugs_v1';
const MAX_RECENT = 10;

export function readRecentlyViewedSlugs(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((s) => typeof s === 'string').slice(0, MAX_RECENT) : [];
  } catch { return []; }
}

export function pushRecentlyViewedSlug(slug: string): void {
  if (typeof window === 'undefined' || !slug) return;
  try {
    const list = readRecentlyViewedSlugs().filter((s) => s !== slug);
    list.unshift(slug);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch { /* ignore */ }
}