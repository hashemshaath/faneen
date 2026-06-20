import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { KNOWLEDGE_ASSISTANT_RELEASE_GATE } from "@/modules/knowledge/release/knowledgeAssistantReleaseGate";
import { buildAssistantKnowledgeAnswerContext } from "@/modules/knowledge/assistant/assistantKnowledgeContext";
import { knowledgeRegistry } from "@/modules/knowledge/knowledgeRegistry";

const root = resolve(__dirname, "..");
const PREVIEW_SRC = readFileSync(
  resolve(root, "components/admin/knowledge/AssistantPreviewPanel.tsx"),
  "utf8",
);
const SUPPORT_SRC = readFileSync(
  resolve(root, "components/admin/knowledge/SupportRepliesPanel.tsx"),
  "utf8",
);
const PILOT_DOC = readFileSync(
  resolve(root, "../docs/knowledge-assistant-internal-operations-pilot-phase-11.md"),
  "utf8",
);

describe("KNOWLEDGE ASSISTANT INTERNAL OPERATIONS PILOT — Phase 11", () => {
  it("release level remains internal_preview with sends/storage disabled", () => {
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.releaseLevel).toBe("internal_preview");
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canEnablePublicAssistant).toBe(false);
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canSendMessages).toBe(false);
    expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.canStoreConversations).toBe(false);
  });

  it("renders the internal-only notice inside the assistant preview panel", () => {
    expect(PREVIEW_SRC).toMatch(/assistant-preview-internal-only-notice/);
    expect(PREVIEW_SRC).toMatch(/داخلي فقط/);
    expect(PREVIEW_SRC).toMatch(/لا إرسال رسائل/);
    expect(PREVIEW_SRC).toMatch(/لا حفظ محادثات/);
    expect(PREVIEW_SRC).toMatch(/لا إطلاق عام/);
    expect(PREVIEW_SRC).toMatch(/مراجعة الرد/);
  });

  it("assistant preview panel makes no external/DB/transport calls", () => {
    for (const forbidden of [
      /fetch\s*\(/,
      /from\s+["']@\/integrations\/supabase/,
      /supabase\./,
      /axios/i,
      /openai/i,
      /anthropic/i,
      /embedding/i,
      /websocket/i,
    ]) {
      expect(PREVIEW_SRC).not.toMatch(forbidden);
    }
  });

  it("support replies panel does not send or persist anything", () => {
    for (const forbidden of [
      /fetch\s*\(/,
      /from\s+["']@\/integrations\/supabase/,
      /supabase\./,
      /\.insert\(/,
      /\.update\(/,
      /\.upsert\(/,
      /sendMessage/i,
      /sendEmail/i,
    ]) {
      expect(SUPPORT_SRC).not.toMatch(forbidden);
    }
  });

  it("blocked topics remain enforced by the release gate", () => {
    for (const topic of [
      "pricing",
      "provider_recommendation",
      "provider_contact_pii",
      "warranty_guarantee",
      "legal_unverified",
    ] as const) {
      expect(KNOWLEDGE_ASSISTANT_RELEASE_GATE.blockedTopics).toContain(topic);
    }
  });

  it("internal items are never returned to non-admin/operations audiences", () => {
    const internalItems = knowledgeRegistry.filter(
      (i) => i.audience.includes("operations") && !i.audience.includes("visitor"),
    );
    expect(internalItems.length).toBeGreaterThan(0);

    for (const audience of ["visitor", "customer", "provider", "business_owner"] as const) {
      const ctx = buildAssistantKnowledgeAnswerContext(
        "internal ops dashboard",
        audience,
        "ar",
      );
      for (const m of ctx.matchedItems) {
        expect(m.item.audience).toContain(audience);
      }
    }
  });

  it("internal operations pilot doc exists with the required sections", () => {
    expect(PILOT_DOC).toMatch(/هدف التشغيل الداخلي/);
    expect(PILOT_DOC).toMatch(/مسموح/);
    expect(PILOT_DOC).toMatch(/ممنوع/);
    expect(PILOT_DOC).toMatch(/fallback/i);
    expect(PILOT_DOC).toMatch(/تصعيد/);
    expect(PILOT_DOC).toMatch(/\|\s*التاريخ\s*\|/);
    expect(PILOT_DOC).toMatch(/answered/);
    expect(PILOT_DOC).toMatch(/blocked_sensitive/);
    expect(PILOT_DOC).toMatch(/needs_knowledge_update/);
  });

  it("pilot doc declares no DB / no edge / no migrations / no logging", () => {
    expect(PILOT_DOC).not.toMatch(/CREATE TABLE/i);
    expect(PILOT_DOC).not.toMatch(/migration/i);
    expect(PILOT_DOC).not.toMatch(/edge function/i);
  });

  it("has no eslint-disable / @ts-ignore suppressions in new files", () => {
    for (const src of [PREVIEW_SRC]) {
      expect(src).not.toMatch(/eslint-disable/);
      expect(src).not.toMatch(/@ts-ignore/);
      expect(src).not.toMatch(/@ts-nocheck/);
    }
  });
});