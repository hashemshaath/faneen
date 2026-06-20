/**
 * Phase-4 — `buildAssistantKnowledgeAnswerContext`.
 *
 * Single safe entrypoint the assistant uses to ground a reply in the
 * unified knowledge registry. Never invents content: if nothing scores
 * above the confidence threshold, returns `allowedToAnswer=false` plus a
 * localized fallback message.
 *
 * No DB, no RPC, no edge calls, no message sending — pure read over
 * `knowledgeRegistry`.
 */
import type {
  KnowledgeAudience,
  KnowledgeContextResult,
  KnowledgeLocale,
} from '../knowledge.types';
import { getAssistantKnowledgeContext } from '../knowledgeHelpers';
import { expandQueryWithSynonyms } from './assistantKnowledgeSynonyms';
import { rankAssistantResults } from './assistantKnowledgeRanking';
import {
  fallbackMessageFor,
  isItemAllowedForAudience,
} from './assistantKnowledgeGuardrails';

export interface AssistantAnswerContext {
  matchedItems: KnowledgeContextResult[];
  confidence: number;
  allowedToAnswer: boolean;
  fallbackMessage: string | null;
  sources: string[];
  relatedRoutes: string[];
}

export const ASSISTANT_DEFAULT_LIMIT = 5;
/** Minimum top-result score before we let the assistant answer. */
export const ASSISTANT_SCORE_THRESHOLD = 10;

export function buildAssistantKnowledgeAnswerContext(
  query: string,
  audience: KnowledgeAudience,
  locale: KnowledgeLocale,
  limit: number = ASSISTANT_DEFAULT_LIMIT,
): AssistantAnswerContext {
  const safeLimit = Math.max(1, Math.min(limit, ASSISTANT_DEFAULT_LIMIT));
  const expanded = expandQueryWithSynonyms(query ?? '');

  // Pull a wider candidate pool so the ranker can re-order before slicing.
  const candidates = getAssistantKnowledgeContext(
    expanded,
    audience,
    locale,
    Math.max(safeLimit * 4, 20),
  );

  // Defensive guardrail layer: drop anything internal for non-internal audiences.
  const guarded = candidates.filter((r) => isItemAllowedForAudience(r.item, audience));

  const ranked = rankAssistantResults(guarded, audience, expanded).slice(0, safeLimit);

  const top = ranked[0]?.score ?? 0;
  const confidence = Math.max(0, Math.min(1, top / 30));
  const allowedToAnswer = ranked.length > 0 && top >= ASSISTANT_SCORE_THRESHOLD;

  return {
    matchedItems: ranked,
    confidence,
    allowedToAnswer,
    fallbackMessage: allowedToAnswer ? null : fallbackMessageFor(locale),
    sources: ranked.map((r) => r.source),
    relatedRoutes: Array.from(new Set(ranked.flatMap((r) => r.relatedRoutes))),
  };
}