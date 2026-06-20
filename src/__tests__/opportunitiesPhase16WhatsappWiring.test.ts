import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const EDGE = "supabase/functions/send-opportunity-whatsapp/index.ts";
const HELPER = "src/modules/notifications/sendOpportunityWhatsapp.ts";

describe("Opportunities Phase 16 — WhatsApp wiring", () => {
  it("edge function exists and targets Meta WhatsApp Cloud API", () => {
    expect(existsSync(resolve(EDGE))).toBe(true);
    const src = readFileSync(resolve(EDGE), "utf8");
    expect(src).toMatch(/graph\.facebook\.com\/v\d+\.0\/\$\{META_PHONE_ID\}\/messages/);
    expect(src).toMatch(/META_WHATSAPP_TOKEN/);
    expect(src).toMatch(/opportunity_message_send_log/);
    expect(src).toMatch(/messaging_product/);
  });

  it("client helper builds bilingual body from catalog and invokes the edge function", () => {
    expect(existsSync(resolve(HELPER))).toBe(true);
    const src = readFileSync(resolve(HELPER), "utf8");
    expect(src).toMatch(/buildOpportunityMessage/);
    expect(src).toMatch(/send-opportunity-whatsapp/);
    expect(src).toMatch(/language/);
  });
});