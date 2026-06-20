import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  KNOWLEDGE_ASSISTANT_RELEASE_GATE,
  isAudienceAllowedByReleaseGate,
  isChannelEnabledByReleaseGate,
  isTopicBlockedByReleaseGate,
  isTopicEscalatedByReleaseGate,
} from "@/modules/knowledge/release/knowledgeAssistantReleaseGate";

const GATE_SOURCE = readFileSync(
  resolve(
    __dirname,
    "../modules/knowledge/release/knowledgeAssistantReleaseGate.ts",
  ),
  "utf8",
);

describe("KNOWLEDGE ASSISTANT RELEASE GATE — Phase 10", () => {
  it("locks the current release level to internal_preview", () => {
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.releaseLevel).toBe(
      "internal_preview",
    );
  });

  it("disables public assistant, sending, and persistence", () => {
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canEnablePublicAssistant).toBe(
      false,
    );
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canSendMessages).toBe(false);
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canStoreConversations).toBe(false);
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canCallExternalApi).toBe(false);
  });

  it("only allows admin and operations audiences", () => {
    expect(isAudienceAllowedByReleaseGate("admin")).toBe(true);
    expect(isAudienceAllowedByReleaseGate("operations")).toBe(true);
    expect(isAudienceAllowedByReleaseGate("visitor")).toBe(false);
    expect(isAudienceAllowedByReleaseGate("customer")).toBe(false);
    expect(isAudienceAllowedByReleaseGate("provider")).toBe(false);
    expect(isAudienceAllowedByReleaseGate("business_owner")).toBe(false);
    expect(isAudienceAllowedByReleaseGate("support")).toBe(false);
  });

  it("only enables admin_preview channel; disables all delivery channels", () => {
    expect(isChannelEnabledByReleaseGate("admin_preview")).toBe(true);
    for (const channel of [
      "support_drafts",
      "customer_dashboard",
      "provider_dashboard",
      "public_website",
      "email",
      "whatsapp",
      "tickets",
    ] as const) {
      expect(isChannelEnabledByReleaseGate(channel)).toBe(false);
      expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.disabledChannels).toContain(
        channel,
      );
    }
  });

  it("blocks the high-risk topics required by the release gate", () => {
    for (const topic of [
      "pricing",
      "provider_recommendation",
      "provider_contact_pii",
      "warranty_guarantee",
      "legal_unverified",
    ] as const) {
      expect(isTopicBlockedByReleaseGate(topic)).toBe(true);
    }
  });

  it("defines the escalation topics that require human review", () => {
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.escalationTopics.length).toBeGreaterThan(
      0,
    );
    expect(isTopicEscalatedByReleaseGate("human_review_required")).toBe(true);
    expect(isTopicEscalatedByReleaseGate("complaint")).toBe(true);
    expect(isTopicEscalatedByReleaseGate("dispute")).toBe(true);
  });

  it("does not import DB / RLS / RPC / migrations / edge / external APIs", () => {
    expect(GATE_SOURCE).not.toMatch(/from\s+["']@\/integrations\/supabase/);
    expect(GATE_SOURCE).not.toMatch(/supabase/i);
    expect(GATE_SOURCE).not.toMatch(/fetch\s*\(/);
    expect(GATE_SOURCE).not.toMatch(/axios/i);
    expect(GATE_SOURCE).not.toMatch(/openai/i);
    expect(GATE_SOURCE).not.toMatch(/anthropic/i);
    expect(GATE_SOURCE).not.toMatch(/embedding/i);
    expect(GATE_SOURCE).not.toMatch(/migration/i);
    expect(GATE_SOURCE).not.toMatch(/edge[-_ ]function/i);
  });

  it("has no eslint-disable / @ts-ignore suppressions", () => {
    expect(GATE_SOURCE).not.toMatch(/eslint-disable/);
    expect(GATE_SOURCE).not.toMatch(/@ts-ignore/);
    expect(GATE_SOURCE).not.toMatch(/@ts-nocheck/);
  });
});