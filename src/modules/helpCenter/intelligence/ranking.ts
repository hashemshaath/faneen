import type { HelpArticle, HelpAudience } from '../types';
import { getContextualArticles } from '../contextualHelp';
import { normalizeQuery, tokenize } from './textNormalize';

export interface RankInput {
  articles: HelpArticle[];
  pageKey?: string | null;
  audience?: HelpAudience | null;
  searchQuery?: string;
  limit?: number;
}

export interface RankedHelpArticle {
  article: HelpArticle;
  score: number;
  reasons: string[];
}

/**
 * Pure ranking helper for published help articles.
 * Combines: page-context relevance, audience match, keyword/title/summary
 * match, popularity (views_count), helpful ratio, and recency.
 * No external calls, no side effects.
 */
export function rankHelpArticles(input: RankInput): RankedHelpArticle[] {
  const contextSlugs = new Set(input.pageKey ? getContextualArticles(input.pageKey) : []);
  const qTokens = tokenize(normalizeQuery(input.searchQuery ?? ''));
  const now = Date.now();

  const ranked = input.articles
    .filter((a) => a.status === 'published')
    .map((a) => {
      let score = 0;
      const reasons: string[] = [];

      if (contextSlugs.has(a.slug)) { score += 40; reasons.push('page-context'); }
      if (input.audience && (a.audience === input.audience || a.audience === 'general')) {
        score += a.audience === input.audience ? 10 : 4;
        reasons.push(`audience:${a.audience}`);
      }

      if (qTokens.length > 0) {
        const hay = normalizeQuery(`${a.title_ar} ${a.title_en} ${a.summary_ar ?? ''} ${a.summary_en ?? ''} ${(a.keywords ?? []).join(' ')} ${a.slug}`);
        const hayTokens = new Set(tokenize(hay));
        let matches = 0;
        for (const t of qTokens) {
          if (hayTokens.has(t)) { matches += 1; continue; }
          // partial match fallback
          for (const ht of hayTokens) {
            if (ht.length >= 3 && (ht.includes(t) || t.includes(ht))) { matches += 0.5; break; }
          }
        }
        if (matches > 0) { score += matches * 12; reasons.push(`q-match:${matches}`); }
      }

      // popularity (capped)
      const popularity = Math.min(20, Math.log1p(Math.max(0, a.views_count ?? 0)) * 4);
      score += popularity;

      // helpful ratio
      const votes = (a.helpful_count ?? 0) + (a.not_helpful_count ?? 0);
      if (votes > 0) {
        const ratio = (a.helpful_count ?? 0) / votes;
        score += ratio * 10;
      }

      // recency decay (0..6 boost for articles updated within last 90 days)
      const updatedAt = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const ageDays = updatedAt > 0 ? (now - updatedAt) / 86_400_000 : 9999;
      if (ageDays < 90) score += Math.max(0, 6 - ageDays / 15);

      return { article: a, score, reasons };
    })
    .sort((a, b) => b.score - a.score);

  const limit = input.limit ?? 8;
  return ranked.slice(0, limit);
}

/**
 * Find articles related to a given article (excluding itself).
 */
export function findRelatedArticles(target: HelpArticle, pool: HelpArticle[], limit = 5): HelpArticle[] {
  const others = pool.filter((a) => a.id !== target.id && a.status === 'published');
  const ranked = rankHelpArticles({
    articles: others,
    audience: target.audience,
    searchQuery: [target.title_en, target.title_ar, ...(target.keywords ?? [])].join(' '),
    limit,
  });
  // Boost same-category
  return ranked
    .map((r) => ({ r, bump: r.article.category_id && r.article.category_id === target.category_id ? 20 : 0 }))
    .sort((a, b) => (b.r.score + b.bump) - (a.r.score + a.bump))
    .slice(0, limit)
    .map((x) => x.r.article);
}