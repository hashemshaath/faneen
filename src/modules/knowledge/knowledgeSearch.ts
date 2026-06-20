import type {
  KnowledgeAudience,
  KnowledgeItem,
  KnowledgeQueryFilter,
  KnowledgeStatus,
  KnowledgeType,
} from './knowledge.types';
import { isAudienceVisible } from './knowledgeAudience';
import { knowledgeRegistry } from './knowledgeRegistry';

function matchesType(item: KnowledgeItem, type?: KnowledgeType | KnowledgeType[]): boolean {
  if (!type) return true;
  return Array.isArray(type) ? type.includes(item.type) : item.type === type;
}

function matchesStatus(
  item: KnowledgeItem,
  status?: KnowledgeStatus | KnowledgeStatus[],
): boolean {
  if (!status) return true;
  return Array.isArray(status) ? status.includes(item.status) : item.status === status;
}

function matchesTags(item: KnowledgeItem, tags?: string[]): boolean {
  if (!tags || tags.length === 0) return true;
  return tags.some((t) => item.tags.includes(t));
}

export function filterKnowledge(
  filter: KnowledgeQueryFilter,
  items: readonly KnowledgeItem[] = knowledgeRegistry,
): KnowledgeItem[] {
  return items.filter((item) => {
    if (filter.audience && !isAudienceVisible(item, filter.audience)) return false;
    if (!matchesType(item, filter.type)) return false;
    if (!matchesStatus(item, filter.status)) return false;
    if (!matchesTags(item, filter.tags)) return false;
    if (filter.categoryId && item.categoryId !== filter.categoryId) return false;
    if (filter.usableByAssistant !== undefined && item.usableByAssistant !== filter.usableByAssistant) {
      return false;
    }
    if (filter.usableInMessages !== undefined && item.usableInMessages !== filter.usableInMessages) {
      return false;
    }
    return true;
  });
}

/** Simple keyword score: counts occurrences of normalised tokens in title+body+tags. */
export function scoreKnowledge(item: KnowledgeItem, query: string, locale: 'ar' | 'en'): number {
  const q = query.trim().toLowerCase();
  if (!q) return item.priority ?? 0;
  const tokens = q.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return item.priority ?? 0;
  const haystack = [
    item.title.ar,
    item.title.en ?? '',
    locale === 'ar' ? item.body.ar : item.body.en ?? item.body.ar,
    item.summary?.ar ?? '',
    item.summary?.en ?? '',
    item.tags.join(' '),
  ]
    .join(' ')
    .toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (haystack.includes(t)) score += 10;
  }
  return score + (item.priority ?? 0) / 10;
}

export function searchKnowledge(
  query: string,
  audience: KnowledgeAudience,
  locale: 'ar' | 'en',
  baseFilter: KnowledgeQueryFilter = {},
): KnowledgeItem[] {
  const items = filterKnowledge({ ...baseFilter, audience });
  return [...items]
    .map((item) => ({ item, score: scoreKnowledge(item, query, locale) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}