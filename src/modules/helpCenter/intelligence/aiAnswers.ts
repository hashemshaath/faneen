import type { HelpArticle, HelpAudience } from '../types';
import { rankHelpArticles } from './ranking';
import { normalizeQuery, tokenize } from './textNormalize';

export interface GenerateHelpAnswerInput {
  question: string;
  articles: HelpArticle[];
  audience?: HelpAudience | null;
  pageKey?: string | null;
  language?: 'ar' | 'en';
  maxSources?: number;
}

export interface HelpAnswerSource {
  slug: string;
  title: string;
  ref_id: string | null;
}

export interface HelpAnswer {
  status: 'answered' | 'low_confidence';
  answer: string;
  sources: HelpAnswerSource[];
  confidence: number; // 0..1
}

const NO_MATCH_AR = 'لم أعثر على مقالة منشورة في مركز المساعدة تغطي هذا الموضوع. حاول إعادة صياغة السؤال أو افتح طلب ميزة.';
const NO_MATCH_EN = "I couldn't find a published help article covering this topic. Try rephrasing or open a feature request.";

/**
 * Generate a grounded answer using ONLY published help articles.
 *
 * Hard rules:
 *  - Pulls content strictly from `articles` (already filtered to help_articles).
 *  - Never fabricates information; if confidence is low, returns a localized
 *    "no published article found" message.
 *  - No DB, no network, no LLM calls. Deterministic.
 */
export function generateHelpAnswer(input: GenerateHelpAnswerInput): HelpAnswer {
  const lang: 'ar' | 'en' = input.language ?? 'en';
  const q = (input.question ?? '').trim();
  if (!q) {
    return { status: 'low_confidence', answer: lang === 'ar' ? NO_MATCH_AR : NO_MATCH_EN, sources: [], confidence: 0 };
  }

  const ranked = rankHelpArticles({
    articles: input.articles.filter((a) => a.status === 'published'),
    audience: input.audience,
    pageKey: input.pageKey,
    searchQuery: q,
    limit: input.maxSources ?? 3,
  });

  if (ranked.length === 0 || ranked[0].score < 18) {
    return { status: 'low_confidence', answer: lang === 'ar' ? NO_MATCH_AR : NO_MATCH_EN, sources: [], confidence: 0 };
  }

  // Extract grounded snippet from the strongest article ONLY (no synthesis across docs).
  const top = ranked[0].article;
  const snippet = extractSnippet(top, q, lang);

  const sources: HelpAnswerSource[] = ranked.map((r) => ({
    slug: r.article.slug,
    title: lang === 'ar' ? r.article.title_ar : r.article.title_en,
    ref_id: r.article.ref_id,
  }));

  // Normalize confidence using the top score (capped).
  const confidence = Math.min(1, ranked[0].score / 80);

  return { status: 'answered', answer: snippet, sources, confidence };
}

function extractSnippet(article: HelpArticle, question: string, lang: 'ar' | 'en'): string {
  const body = (lang === 'ar' ? article.content_ar : article.content_en) ?? article.summary_en ?? article.summary_ar ?? '';
  const title = lang === 'ar' ? article.title_ar : article.title_en;
  if (!body) return title;
  // Split into sentences and pick the best-matching ones.
  const sentences = body
    .replace(/\r/g, '')
    .split(/(?<=[.!؟?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length === 0) return title;

  const qTokens = new Set(tokenize(normalizeQuery(question)));
  if (qTokens.size === 0) return sentences.slice(0, 2).join(' ');

  const scored = sentences.map((s) => {
    const tokens = tokenize(normalizeQuery(s));
    let m = 0;
    for (const t of tokens) if (qTokens.has(t)) m += 1;
    return { s, m };
  });
  scored.sort((a, b) => b.m - a.m);
  const picked = scored.slice(0, 2).filter((x) => x.m > 0).map((x) => x.s);
  return picked.length > 0 ? picked.join(' ') : sentences.slice(0, 2).join(' ');
}