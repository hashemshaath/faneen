/**
 * Phase-4 — guarded wrapper around `getMessageKnowledgeSnippets`.
 *
 * Adds a defensive guardrail pass so internal content never leaks into a
 * customer or provider message payload. No sending happens here — the
 * caller is responsible for constructing the email / WhatsApp / in-app
 * notification payload.
 */
import type {
  KnowledgeAudience,
  KnowledgeContextResult,
  KnowledgeLocale,
} from '../knowledge.types';
import { getMessageKnowledgeSnippets as baseSnippets } from '../knowledgeHelpers';
import { isItemAllowedForAudience } from '../assistant/assistantKnowledgeGuardrails';

export function getSafeMessageKnowledgeSnippets(
  audience: KnowledgeAudience,
  intent: string,
  locale: KnowledgeLocale,
  limit = 3,
): KnowledgeContextResult[] {
  const items = baseSnippets(audience, intent, locale, Math.max(limit, 5));
  return items
    .filter((r) => isItemAllowedForAudience(r.item, audience))
    .slice(0, limit);
}