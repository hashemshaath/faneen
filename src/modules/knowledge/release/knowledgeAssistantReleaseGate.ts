/**
 * Knowledge Assistant Release Gate — Phase 10
 *
 * Declarative-only release configuration. This module MUST NOT:
 *   - send messages
 *   - persist conversations
 *   - call external APIs
 *   - mutate database / RLS / RPC
 *   - enable any public assistant UI
 *
 * It only describes the currently authorized scope so that callers can
 * read-and-respect the gate. Flipping a flag here does NOT enable a
 * behavior on its own — each consuming surface must opt in explicitly
 * in a later phase.
 */

export type KnowledgeAssistantReleaseLevel =
  | "internal_preview"
  | "support_drafts"
  | "authenticated_dashboard"
  | "provider_dashboard"
  | "public_website";

export type KnowledgeAssistantAudience =
  | "admin"
  | "operations"
  | "support"
  | "business_owner"
  | "provider"
  | "customer"
  | "visitor";

export type KnowledgeAssistantChannel =
  | "admin_preview"
  | "support_drafts"
  | "customer_dashboard"
  | "provider_dashboard"
  | "public_website"
  | "email"
  | "whatsapp"
  | "tickets";

export type KnowledgeAssistantBlockedTopic =
  | "pricing"
  | "provider_recommendation"
  | "provider_contact_pii"
  | "warranty_guarantee"
  | "legal_unverified"
  | "financial_unverified"
  | "out_of_scope";

export type KnowledgeAssistantEscalationTopic =
  | "human_review_required"
  | "complaint"
  | "dispute"
  | "contract_change"
  | "refund"
  | "account_security";

export interface KnowledgeAssistantReleaseGate {
  readonly releaseLevel: KnowledgeAssistantReleaseLevel;
  readonly allowedAudiences: ReadonlyArray<KnowledgeAssistantAudience>;
  readonly enabledChannels: ReadonlyArray<KnowledgeAssistantChannel>;
  readonly disabledChannels: ReadonlyArray<KnowledgeAssistantChannel>;
  readonly blockedTopics: ReadonlyArray<KnowledgeAssistantBlockedTopic>;
  readonly escalationTopics: ReadonlyArray<KnowledgeAssistantEscalationTopic>;
  readonly canEnablePublicAssistant: false;
  readonly canSendMessages: false;
  readonly canStoreConversations: false;
  readonly canCallExternalApi: false;
  readonly requiresHumanApproval: true;
}

export const KNOWLEDGE_ASSISTANT_RELEASE_GATE: KnowledgeAssistantReleaseGate = {
  releaseLevel: "internal_preview",
  allowedAudiences: ["admin", "operations"],
  enabledChannels: ["admin_preview"],
  disabledChannels: [
    "support_drafts",
    "customer_dashboard",
    "provider_dashboard",
    "public_website",
    "email",
    "whatsapp",
    "tickets",
  ],
  blockedTopics: [
    "pricing",
    "provider_recommendation",
    "provider_contact_pii",
    "warranty_guarantee",
    "legal_unverified",
    "financial_unverified",
    "out_of_scope",
  ],
  escalationTopics: [
    "human_review_required",
    "complaint",
    "dispute",
    "contract_change",
    "refund",
    "account_security",
  ],
  canEnablePublicAssistant: false,
  canSendMessages: false,
  canStoreConversations: false,
  canCallExternalApi: false,
  requiresHumanApproval: true,
};

export function isAudienceAllowedByReleaseGate(
  audience: KnowledgeAssistantAudience,
  gate: KnowledgeAssistantReleaseGate = KNOWLEDGE_ASSISTANT_RELEASE_GATE,
): boolean {
  return gate.allowedAudiences.includes(audience);
}

export function isChannelEnabledByReleaseGate(
  channel: KnowledgeAssistantChannel,
  gate: KnowledgeAssistantReleaseGate = KNOWLEDGE_ASSISTANT_RELEASE_GATE,
): boolean {
  return gate.enabledChannels.includes(channel);
}

export function isTopicBlockedByReleaseGate(
  topic: KnowledgeAssistantBlockedTopic,
  gate: KnowledgeAssistantReleaseGate = KNOWLEDGE_ASSISTANT_RELEASE_GATE,
): boolean {
  return gate.blockedTopics.includes(topic);
}

export function isTopicEscalatedByReleaseGate(
  topic: KnowledgeAssistantEscalationTopic,
  gate: KnowledgeAssistantReleaseGate = KNOWLEDGE_ASSISTANT_RELEASE_GATE,
): boolean {
  return gate.escalationTopics.includes(topic);
}