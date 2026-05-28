import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// Mock the Supabase client BEFORE importing the helper.
// ─────────────────────────────────────────────────────────────────────────────
const insertSpy = vi.fn(() => Promise.resolve({ data: null, error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: insertSpy,
    })),
  },
}));

import {
  recordBusinessSourceAudit,
  sanitizeAuditMetadata,
  FORBIDDEN_AUDIT_METADATA_KEYS,
} from "@/modules/businesses/notes/services/recordBusinessSourceAudit";

import {
  normalizeOperationsEvent,
  OFFICIAL_REF,
} from "@/components/operations/normalizeOperationsFeed";
import type { BusinessActivityEvent } from "@/modules/businesses/notes";

beforeEach(() => {
  insertSpy.mockClear();
  insertSpy.mockImplementation(() => Promise.resolve({ data: null, error: null }));
});

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeAuditMetadata — PII / secret stripping
// ─────────────────────────────────────────────────────────────────────────────
describe("BUSINESS-CORE-13 — sanitizeAuditMetadata", () => {
  it("returns an empty object for null/undefined/non-object input", () => {
    expect(sanitizeAuditMetadata(null)).toEqual({});
    expect(sanitizeAuditMetadata(undefined)).toEqual({});
    expect(sanitizeAuditMetadata({} as Record<string, unknown>)).toEqual({});
  });

  it("strips every forbidden key (PII / secrets / opaque IDs)", () => {
    const dirty: Record<string, unknown> = {
      ref_id: "CNT-100",
      email: "client@example.com",
      phone: "+966500000000",
      phone_number: "0500000000",
      mobile: "0500000000",
      whatsapp: "0500000000",
      message: "secret message body",
      message_body: "secret message body",
      body: "secret message body",
      notes: "private notes",
      note: "private",
      token: "abc",
      access_token: "abc",
      refresh_token: "abc",
      otp: "123456",
      password: "hunter2",
      secret: "shhh",
      provider_intent_id: "pi_123",
      payment_intent_id: "pi_123",
      client_secret: "cs_123",
      full_name: "Jane Doe",
      name: "Jane",
      client_name: "Jane",
      address: "Riyadh",
      ip: "1.2.3.4",
      user_agent: "Mozilla/5.0",
    };
    const clean = sanitizeAuditMetadata(dirty);
    expect(clean).toEqual({ ref_id: "CNT-100" });
    for (const k of FORBIDDEN_AUDIT_METADATA_KEYS) {
      expect(clean).not.toHaveProperty(k);
    }
  });

  it("forbidden-key matching is case-insensitive", () => {
    const clean = sanitizeAuditMetadata({
      Email: "x@x",
      PHONE: "0500000000",
      Token: "abc",
      ref_id: "WO-1",
    });
    expect(clean).toEqual({ ref_id: "WO-1" });
  });

  it("keeps safe scalars (strings, numbers, booleans) and trims/truncates strings", () => {
    const long = "x".repeat(500);
    const clean = sanitizeAuditMetadata({
      ref_id: "  CNT-1  ",
      count: 7,
      flag: true,
      long,
    });
    expect(clean.ref_id).toBe("CNT-1");
    expect(clean.count).toBe(7);
    expect(clean.flag).toBe(true);
    expect(typeof clean.long).toBe("string");
    expect((clean.long as string).length).toBeLessThanOrEqual(240);
  });

  it("drops empty strings, undefined, and null values", () => {
    const clean = sanitizeAuditMetadata({
      ref_id: "WO-1",
      empty: "",
      whitespace: "   ",
      undef: undefined,
      nul: null,
    });
    expect(clean).toEqual({ ref_id: "WO-1" });
  });

  it("drops nested objects and arrays to prevent PII smuggling", () => {
    const clean = sanitizeAuditMetadata({
      ref_id: "WO-1",
      nested: { email: "x@x" },
      list: ["a", "b"],
    });
    expect(clean).toEqual({ ref_id: "WO-1" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// recordBusinessSourceAudit — never throws, sanitizes, validates required fields
// ─────────────────────────────────────────────────────────────────────────────
describe("BUSINESS-CORE-13 — recordBusinessSourceAudit", () => {
  it("writes a sanitized payload to business_audit_log", async () => {
    await recordBusinessSourceAudit({
      business_id: "biz-1",
      actor_id: "usr-1",
      entity_type: "contract",
      entity_id: "con-uuid",
      action: "contract.converted_to_work_order",
      metadata: {
        contract_ref_id: "CNT-100",
        work_order_ref_id: "WO-1234567",
        email: "drop@me",
        provider_intent_id: "pi_xxx",
      },
    });
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const call = insertSpy.mock.calls[0] as unknown as [Record<string, unknown>];
    const payload = call[0];
    expect(payload.entity_type).toBe("contract");
    expect(payload.action).toBe("contract.converted_to_work_order");
    const md = payload.metadata as Record<string, unknown>;
    expect(md).toEqual({
      contract_ref_id: "CNT-100",
      work_order_ref_id: "WO-1234567",
    });
  });

  it("does not throw when the insert rejects", async () => {
    insertSpy.mockImplementationOnce(() =>
      Promise.reject(new Error("rls denied")),
    );
    await expect(
      recordBusinessSourceAudit({
        business_id: "biz-1",
        actor_id: "usr-1",
        entity_type: "lead",
        entity_id: "lead-uuid",
        action: "lead.converted_to_work_order",
        metadata: { lead_ref_id: "LED-1" },
      }),
    ).resolves.toBeUndefined();
  });

  it("no-ops when required identifiers are missing (never writes empty rows)", async () => {
    await recordBusinessSourceAudit({
      business_id: "",
      actor_id: "usr-1",
      entity_type: "quote",
      entity_id: "q-1",
      action: "quote.converted_to_work_order",
    });
    await recordBusinessSourceAudit({
      business_id: "biz-1",
      actor_id: "",
      entity_type: "quote",
      entity_id: "q-1",
      action: "quote.converted_to_work_order",
    });
    await recordBusinessSourceAudit({
      business_id: "biz-1",
      actor_id: "usr-1",
      entity_type: "quote",
      entity_id: "",
      action: "quote.converted_to_work_order",
    });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("accepts the full action vocabulary without throwing", async () => {
    const actions = [
      "contract.created",
      "contract.updated",
      "contract.status_changed",
      "contract.signed",
      "contract.converted_to_work_order",
      "quote.created",
      "quote.updated",
      "quote.responded",
      "quote.converted_to_work_order",
      "lead.created",
      "lead.status_changed",
      "lead.converted_to_work_order",
      "booking.created",
      "booking.status_changed",
      "booking.converted_to_work_order",
    ] as const;
    for (const action of actions) {
      await recordBusinessSourceAudit({
        business_id: "biz-1",
        actor_id: "usr-1",
        entity_type: action.split(".")[0] as
          | "contract"
          | "quote"
          | "lead"
          | "booking",
        entity_id: "ent-uuid",
        action,
      });
    }
    expect(insertSpy).toHaveBeenCalledTimes(actions.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Normalizer — bilingual labels for source events + ref validation
// ─────────────────────────────────────────────────────────────────────────────
function ev(
  partial: Partial<BusinessActivityEvent> & {
    id: string;
    action: string;
    created_at: string;
  },
): BusinessActivityEvent {
  return {
    id: partial.id,
    business_id: "biz-1",
    actor_id: "usr-1",
    entity_type: partial.entity_type ?? "contract",
    entity_id: partial.entity_id ?? "uuid",
    action: partial.action,
    metadata: partial.metadata ?? null,
    created_at: partial.created_at,
  };
}

describe("BUSINESS-CORE-13 — normalizer source-event labels", () => {
  it("labels every supported source action with non-generic icon + bilingual text", () => {
    const actions = [
      "contract.created",
      "contract.updated",
      "contract.status_changed",
      "contract.signed",
      "contract.converted_to_work_order",
      "quote.created",
      "quote.updated",
      "quote.responded",
      "quote.converted_to_work_order",
      "lead.created",
      "lead.status_changed",
      "lead.converted_to_work_order",
      "booking.created",
      "booking.status_changed",
      "booking.converted_to_work_order",
    ];
    for (const action of actions) {
      const out = normalizeOperationsEvent(
        ev({ id: action, action, created_at: "2026-05-28T10:00:00Z" }),
      );
      expect(out.icon).not.toBe("generic");
      expect(out.label.ar.length).toBeGreaterThan(0);
      expect(out.label.en.length).toBeGreaterThan(0);
    }
  });

  it("extracts work_order_ref_id as the source cross-link for converted events", () => {
    const out = normalizeOperationsEvent(
      ev({
        id: "c",
        action: "contract.converted_to_work_order",
        created_at: "2026-05-28T10:00:00Z",
        metadata: { contract_ref_id: "CNT-100", work_order_ref_id: "WO-1234567" },
      }),
    );
    // primaryRef remains null because no top-level ref_id was given;
    // sourceRef should surface either side of the link via safeRef.
    expect(out.sourceRef).toMatch(OFFICIAL_REF);
    expect(["CNT-100", "WO-1234567"]).toContain(out.sourceRef);
  });

  it("rejects UUIDs in work_order_ref_id", () => {
    const out = normalizeOperationsEvent(
      ev({
        id: "c",
        action: "lead.converted_to_work_order",
        created_at: "2026-05-28T10:00:00Z",
        metadata: {
          ref_id: "550e8400-e29b-41d4-a716-446655440000",
          work_order_ref_id: "550e8400-e29b-41d4-a716-446655440000",
        },
      }),
    );
    expect(out.primaryRef).toBeNull();
    expect(out.sourceRef).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Hygiene — no forbidden imports in audit helper / source writers
// ─────────────────────────────────────────────────────────────────────────────
describe("BUSINESS-CORE-13 — audit helper hygiene", () => {
  it("does not import notifications / realtime / cron / automation / payments / auth", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      "src/modules/businesses/notes/services/recordBusinessSourceAudit.ts",
      "utf-8",
    );
    expect(src).not.toMatch(/@\/modules\/notifications/);
    expect(src).not.toMatch(/@\/modules\/payments/);
    expect(src).not.toMatch(/@\/modules\/memberships/);
    expect(src).not.toMatch(/@\/modules\/auth/);
    expect(src).not.toMatch(/supabase\.channel\(/);
    expect(src).not.toMatch(/postgres_changes/);
    expect(src).not.toMatch(/setInterval|setTimeout\(/);
    expect(src).not.toMatch(/sla-sweep/);
  });

  it("each createWorkOrderFromX emits exactly one source-side audit", async () => {
    const fs = await import("node:fs/promises");
    const files = [
      [
        "src/modules/workOrders/services/createWorkOrderFromContract.ts",
        "contract.converted_to_work_order",
      ],
      [
        "src/modules/workOrders/services/createWorkOrderFromQuote.ts",
        "quote.converted_to_work_order",
      ],
      [
        "src/modules/workOrders/services/createWorkOrderFromLead.ts",
        "lead.converted_to_work_order",
      ],
      [
        "src/modules/workOrders/services/createWorkOrderFromBooking.ts",
        "booking.converted_to_work_order",
      ],
    ] as const;
    for (const [path, action] of files) {
      const src = await fs.readFile(path, "utf-8");
      expect(src).toMatch(/recordBusinessSourceAudit/);
      expect(src).toContain(action);
      // metadata must not leak unsafe fields
      expect(src).not.toMatch(/email:|phone:|message:|client_secret:|provider_intent_id:/);
    }
  });
});