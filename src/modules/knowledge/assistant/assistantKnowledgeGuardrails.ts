/**
 * Phase-4 — guardrails that decide whether a knowledge item may surface to
 * a given assistant audience. Belt-and-braces layer on top of
 * `isAudienceVisible` so internal/operations content never leaks to public
 * audiences even if a registry item is mis-tagged.
 */
import type { KnowledgeAudience, KnowledgeItem } from '../knowledge.types';
import { isInternalAudience } from '../knowledgeAudience';

export const INTERNAL_CATEGORY_ID = 'internal-ops';

export function isInternalContent(item: KnowledgeItem): boolean {
  return item.status === 'internal' || item.categoryId === INTERNAL_CATEGORY_ID;
}

export function isItemAllowedForAudience(
  item: KnowledgeItem,
  audience: KnowledgeAudience,
): boolean {
  if (isInternalContent(item) && !isInternalAudience(audience)) return false;
  return true;
}

export const ASSISTANT_FALLBACK_AR =
  'لا أملك معلومة موثقة كافية للإجابة من مركز المعرفة. يمكنني توجيهك للدعم أو مساعدتك في صياغة سؤالك بشكل أوضح.';

export const ASSISTANT_FALLBACK_EN =
  'I do not have enough verified information from the knowledge base to answer. I can route you to support or help you rephrase the question.';

export function fallbackMessageFor(locale: 'ar' | 'en'): string {
  return locale === 'en' ? ASSISTANT_FALLBACK_EN : ASSISTANT_FALLBACK_AR;
}