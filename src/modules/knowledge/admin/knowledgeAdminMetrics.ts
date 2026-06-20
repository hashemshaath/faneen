import type { KnowledgeItem } from '../knowledge.types';
import { isInternalCategory } from '../knowledgeCategories';

export interface KnowledgeAdminMetrics {
  total: number;
  published: number;
  draft: number;
  internal: number;
  assistantReady: number;
  messagesReady: number;
  missingEnglish: number;
  needsReview: number;
}

/** Pure metrics for the admin header — computed from the in-memory registry. */
export function computeKnowledgeAdminMetrics(
  items: readonly KnowledgeItem[],
): KnowledgeAdminMetrics {
  let published = 0, draft = 0, internal = 0;
  let assistantReady = 0, messagesReady = 0;
  let missingEnglish = 0, needsReview = 0;

  for (const item of items) {
    if (item.status === 'published') published++;
    else if (item.status === 'draft') draft++;
    else if (item.status === 'internal') internal++;
    if (item.usableByAssistant) assistantReady++;
    if (item.usableInMessages) messagesReady++;
    if (!item.title.en || !item.body.en) missingEnglish++;
    const isInternal = item.status === 'internal'
      || item.type === 'internal_note'
      || isInternalCategory(item.categoryId);
    if (!isInternal && item.status === 'draft') needsReview++;
  }
  return {
    total: items.length,
    published, draft, internal,
    assistantReady, messagesReady,
    missingEnglish, needsReview,
  };
}