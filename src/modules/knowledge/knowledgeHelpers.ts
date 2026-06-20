import type {
  KnowledgeAudience,
  KnowledgeContextResult,
  KnowledgeItem,
  KnowledgeLocale,
} from './knowledge.types';
import { filterKnowledge, scoreKnowledge } from './knowledgeSearch';
import { isInternalAudience } from './knowledgeAudience';

function pick(value: { ar: string; en?: string } | undefined, locale: KnowledgeLocale): string {
  if (!value) return '';
  if (locale === 'en' && value.en) return value.en;
  return value.ar;
}

function toContextResult(
  item: KnowledgeItem,
  score: number,
  locale: KnowledgeLocale,
): KnowledgeContextResult {
  return {
    item,
    score,
    title: pick(item.title, locale),
    summary: pick(item.summary, locale),
    body: pick(item.body, locale),
    source: item.source,
    tags: [...item.tags],
    relatedRoutes: item.relatedRoutes ? [...item.relatedRoutes] : [],
  };
}

/**
 * Returns ranked knowledge context for an AI assistant query.
 *
 * Filters strictly to items marked `usableByAssistant`. Non-internal
 * audiences never receive internal-only items. Returns at most `limit`
 * results; never invents content — only surfaces registry entries.
 */
export function getAssistantKnowledgeContext(
  query: string,
  audience: KnowledgeAudience,
  locale: KnowledgeLocale,
  limit = 5,
): KnowledgeContextResult[] {
  const allowedStatuses = isInternalAudience(audience)
    ? (['published', 'internal'] as const)
    : (['published'] as const);

  const pool = filterKnowledge({
    audience,
    usableByAssistant: true,
    status: [...allowedStatuses],
  });

  return pool
    .map((item) => ({ item, score: scoreKnowledge(item, query, locale) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, score }) => toContextResult(item, score, locale));
}

/**
 * Returns customer/provider-safe message snippets for a given intent (tag).
 *
 * Excludes internal items and items not flagged `usableInMessages`. No
 * sending happens here — callers build their own delivery payload.
 */
export function getMessageKnowledgeSnippets(
  audience: KnowledgeAudience,
  intent: string,
  locale: KnowledgeLocale,
  limit = 3,
): KnowledgeContextResult[] {
  const pool = filterKnowledge({
    audience,
    usableInMessages: true,
    status: 'published',
    tags: intent ? [intent] : undefined,
  });

  return pool
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .slice(0, limit)
    .map((item) => toContextResult(item, item.priority ?? 0, locale));
}