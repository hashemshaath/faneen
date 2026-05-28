import { describe, it, expect } from "vitest";
import {
  OFFICIAL_REF,
  normalizeOperationsEvent,
  normalizeOperationsFeed,
  groupOperationsFeedByDay,
  buildOperationsFeed,
} from "@/components/operations/normalizeOperationsFeed";
import type { BusinessActivityEvent } from "@/modules/businesses/notes";

function ev(
  partial: Partial<BusinessActivityEvent> & { id: string; action: string; created_at: string },
): BusinessActivityEvent {
  return {
    id: partial.id,
    business_id: "biz-1",
    actor_id: "usr-1",
    entity_type: partial.entity_type ?? "work_order",
    entity_id: partial.entity_id ?? "wo-uuid",
    action: partial.action,
    metadata: partial.metadata ?? null,
    created_at: partial.created_at,
  };
}

describe("BUSINESS-CORE-12 — normalizeOperationsFeed", () => {
  it("normalizes every supported work_order.* action with bilingual labels", () => {
    const supported = [
      "work_order.created",
      "work_order.updated",
      "work_order.stage_updated",
      "work_order.task_created",
      "work_order.task_completed",
      "work_order.comment_added",
      "work_order.created_from_contract",
      "work_order.created_from_quote",
      "work_order.created_from_lead",
      "work_order.created_from_booking",
    ];
    for (const action of supported) {
      const out = normalizeOperationsEvent(
        ev({ id: action, action, created_at: "2026-05-28T10:00:00Z" }),
      );
      expect(out.icon).not.toBe("generic");
      expect(out.label.ar.length).toBeGreaterThan(0);
      expect(out.label.en.length).toBeGreaterThan(0);
    }
  });

  it("labels unknown actions as generic without throwing", () => {
    const out = normalizeOperationsEvent(
      ev({ id: "x", action: "mystery.something", created_at: "2026-05-28T10:00:00Z" }),
    );
    expect(out.icon).toBe("generic");
    expect(out.tone).toBe("neutral");
    expect(out.label.en).toBe("Activity");
  });

  it("uppercases + validates primary ref, rejects UUIDs and junk", () => {
    const good = normalizeOperationsEvent(
      ev({
        id: "a",
        action: "work_order.created",
        created_at: "2026-05-28T10:00:00Z",
        metadata: { ref_id: "wo-1234567" },
      }),
    );
    expect(good.primaryRef).toBe("WO-1234567");

    const uuid = normalizeOperationsEvent(
      ev({
        id: "b",
        action: "work_order.created",
        created_at: "2026-05-28T10:00:00Z",
        metadata: { ref_id: "550e8400-e29b-41d4-a716-446655440000" },
      }),
    );
    expect(uuid.primaryRef).toBeNull();

    const empty = normalizeOperationsEvent(
      ev({
        id: "c",
        action: "work_order.created",
        created_at: "2026-05-28T10:00:00Z",
        metadata: { ref_id: "" },
      }),
    );
    expect(empty.primaryRef).toBeNull();
  });

  it("extracts task ref for task events", () => {
    const out = normalizeOperationsEvent(
      ev({
        id: "t",
        action: "work_order.task_created",
        created_at: "2026-05-28T10:00:00Z",
        metadata: { ref_id: "TASK-9000001", task_id: "uuid" },
      }),
    );
    expect(out.primaryRef).toBe("TASK-9000001");
  });

  it("extracts each supported source_ref_id variant", () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ["work_order.created_from_contract", { ref_id: "WO-1", contract_ref_id: "CNT-100" }, "CNT-100"],
      ["work_order.created_from_quote",    { ref_id: "WO-2", quote_ref_id: "QTE-200" },    "QTE-200"],
      ["work_order.created_from_lead",     { ref_id: "WO-3", lead_ref_id: "LED-300" },     "LED-300"],
      ["work_order.created_from_booking",  { ref_id: "WO-4", booking_ref_id: "BKG-400" },  "BKG-400"],
    ];
    for (const [action, metadata, expected] of cases) {
      const out = normalizeOperationsEvent(
        ev({ id: action, action, created_at: "2026-05-28T10:00:00Z", metadata }),
      );
      expect(out.sourceRef).toBe(expected);
      expect(out.primaryRef).toBe((metadata.ref_id as string).toUpperCase());
    }
  });

  it("never returns a source ref when only a UUID is present", () => {
    const out = normalizeOperationsEvent(
      ev({
        id: "s",
        action: "work_order.created_from_contract",
        created_at: "2026-05-28T10:00:00Z",
        metadata: { ref_id: "WO-1", contract_ref_id: "550e8400-e29b-41d4-a716-446655440000" },
      }),
    );
    expect(out.sourceRef).toBeNull();
  });

  it("handles null/empty metadata defensively", () => {
    const out = normalizeOperationsEvent(
      ev({ id: "n", action: "work_order.updated", created_at: "2026-05-28T10:00:00Z", metadata: null }),
    );
    expect(out.primaryRef).toBeNull();
    expect(out.sourceRef).toBeNull();
  });

  it("groups items by calendar day, newest first", () => {
    const items = normalizeOperationsFeed([
      ev({ id: "1", action: "work_order.created", created_at: "2026-05-28T01:00:00Z" }),
      ev({ id: "2", action: "work_order.updated", created_at: "2026-05-28T22:00:00Z" }),
      ev({ id: "3", action: "work_order.created", created_at: "2026-05-27T10:00:00Z" }),
    ]);
    const groups = groupOperationsFeedByDay(items);
    expect(groups.length).toBe(2);
    // newest day first
    expect(groups[0].day > groups[1].day).toBe(true);
    expect(groups[0].items.length).toBe(2);
    expect(groups[1].items.length).toBe(1);
  });

  it("buildOperationsFeed returns [] for null/empty input", () => {
    expect(buildOperationsFeed(null)).toEqual([]);
    expect(buildOperationsFeed(undefined)).toEqual([]);
    expect(buildOperationsFeed([])).toEqual([]);
  });

  it("OFFICIAL_REF accepts known prefixes and rejects UUIDs", () => {
    expect(OFFICIAL_REF.test("WO-1234567")).toBe(true);
    expect(OFFICIAL_REF.test("TASK-9000001")).toBe(true);
    expect(OFFICIAL_REF.test("CNT-100")).toBe(true);
    expect(OFFICIAL_REF.test("QTE-200")).toBe(true);
    expect(OFFICIAL_REF.test("LED-300")).toBe(true);
    expect(OFFICIAL_REF.test("BKG-400")).toBe(true);
    expect(OFFICIAL_REF.test("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
    expect(OFFICIAL_REF.test("wo-1234567")).toBe(false);
    expect(OFFICIAL_REF.test("")).toBe(false);
  });
});

describe("BUSINESS-CORE-12 — UnifiedOperationsFeed component hygiene", () => {
  it("does not import realtime / cron / notifications / automation / payment / auth", async () => {
    const fs = await import("node:fs/promises");
    const path = "src/components/operations/UnifiedOperationsFeed.tsx";
    const src = await fs.readFile(path, "utf-8");
    expect(src).not.toMatch(/supabase\.channel\(/);
    expect(src).not.toMatch(/postgres_changes/);
    expect(src).not.toMatch(/from\(['"]work_orders['"]\)/);
    expect(src).not.toMatch(/from\(['"]business_audit_log['"]\)/);
    expect(src).not.toMatch(/notifications/i);
    expect(src).not.toMatch(/cron/i);
    expect(src).not.toMatch(/sla-sweep/);
    expect(src).not.toMatch(/payment/i);
    expect(src).not.toMatch(/membership/i);
    expect(src).not.toMatch(/@\/modules\/auth/);
  });

  it("uses only the businesses/notes wrapper for data access", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      "src/components/operations/UnifiedOperationsFeed.tsx",
      "utf-8",
    );
    expect(src).toMatch(/listBusinessActivityTimeline/);
    expect(src).toMatch(/@\/modules\/businesses\/notes/);
  });
});