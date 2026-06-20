/**
 * Phase-5 — `buildSupportReplyDraft`. Pure read over `knowledgeRegistry`
 * via the Phase-4 assistant guardrails. NEVER sends anything, NEVER
 * stores a draft, NEVER calls an edge function or external API. Returns
 * a serialisable draft the caller may use for email / WhatsApp / ticket
 * / in-app surfaces.
 */
import { buildAssistantKnowledgeAnswerContext } from '../assistant/assistantKnowledgeContext';
import { containsForbiddenInternalContent } from './supportReplyGuardrails';
import { detectMissingInformation, shouldEscalate, maxReplyLength } from './supportReplyGuardrails';
import {
  classifySupportIntent,
  intentToSnippetTags,
} from './supportReplyIntents';
import { fallbackReply, renderReply } from './supportReplyTemplates';
import type {
  SupportReplyDraft,
  SupportReplyInput,
} from './supportReply.types';

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max - 1).trimEnd();
  return `${slice}…`;
}

function pickBody(item: { body: { ar: string; en?: string } }, locale: 'ar' | 'en'): string {
  if (locale === 'en' && item.body.en) return item.body.en;
  return item.body.ar;
}

export function buildSupportReplyDraft(input: SupportReplyInput): SupportReplyDraft {
  const tone = input.tone ?? 'neutral';
  const locale = input.locale;
  const intent = classifySupportIntent(input.message);

  const ctx = buildAssistantKnowledgeAnswerContext(input.message, input.audience, locale);

  // Source body lines come ONLY from registry items the guardrails approved.
  const tags = intentToSnippetTags(intent);
  const ranked = ctx.matchedItems.filter((r) => {
    if (tags.length === 0) return true;
    return tags.some((t) => r.item.tags.includes(t)) || r.item.categoryId === tags[0];
  });
  const chosen = ranked.length > 0 ? ranked : ctx.matchedItems;
  const bodyLines = chosen
    .slice(0, 2)
    .map((r) => pickBody(r.item, locale))
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => !containsForbiddenInternalContent(s));

  const canAnswer = ctx.allowedToAnswer && bodyLines.length > 0;
  const missingInformation = detectMissingInformation(intent, input.message);
  const escalationRecommended = shouldEscalate(intent, canAnswer);

  const rendered = canAnswer
    ? renderReply({
        channel: input.channel,
        tone,
        locale,
        bodyLines,
        missingInformation,
        escalationRecommended,
      })
    : fallbackReply(locale);

  const reply = truncate(rendered, maxReplyLength(input.channel));

  return {
    intent,
    canAnswer,
    reply,
    confidence: ctx.confidence,
    sources: canAnswer
      ? chosen.slice(0, 2).map((r) => r.source)
      : [],
    relatedRoutes: canAnswer
      ? Array.from(new Set(chosen.slice(0, 2).flatMap((r) => r.relatedRoutes)))
      : [],
    escalationRecommended,
    missingInformation,
  };
}