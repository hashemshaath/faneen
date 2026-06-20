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
  // Pull a wider pool so we can re-prioritise pure message templates above
  // generic guides that happen to share the same tag.
  const pool = baseSnippets(audience, intent, locale, Math.max(limit * 8, 20));
  const guarded = pool.filter((r) => isItemAllowedForAudience(r.item, audience));
  const sorted = [...guarded].sort((a, b) => {
    const aTpl = a.item.type === 'message_template' ? 1 : 0;
    const bTpl = b.item.type === 'message_template' ? 1 : 0;
    if (aTpl !== bTpl) return bTpl - aTpl;
    return (b.item.priority ?? 0) - (a.item.priority ?? 0);
  });
  return sorted.slice(0, limit);
}