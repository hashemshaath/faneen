import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FILES = {
  contract: "../modules/contracts/services/getAdminContractSummaryByRef.ts",
  quote: "../modules/quotes/services/getAdminQuoteSummaryByRef.ts",
  lead: "../modules/leads/services/getAdminLeadSummaryByRef.ts",
  booking: "../modules/bookings/services/getAdminBookingSummaryByRef.ts",
  business: "../modules/businesses/services/getAdminBusinessSummaryByRef.ts",
  task: "../modules/workOrders/services/getAdminTaskSummaryByRef.ts",
  resolver:
    "../modules/admin/services/operations/getAdminReferenceSummary.ts",
  adminBarrel: "../modules/admin/index.ts",
  page: "../pages/admin/AdminReferenceInspector.tsx",
} as const;

function read(rel: string): string {
  return readFileSync(resolve(__dirname, rel), "utf8");
}

/* ------------------------------------------------------------------ */
/* Static safety checks — each wrapper                                 */
/* ------------------------------------------------------------------ */
describe("BUSINESS-ADMIN-4 — wrapper static safety", () => {
  const sources = Object.fromEntries(
    Object.entries(FILES)
      .filter(([k]) => !["resolver", "adminBarrel", "page"].includes(k))
      .map(([k, p]) => [k, read(p)]),
  ) as Record<string, string>;

  it.each(Object.keys(sources))(
    "%s wrapper never references unsafe fields",
    (key) => {
      const src = sources[key];
      for (const bad of [
        /provider_intent_id/,
        /access_token/,
        /client_secret/,
        /@phone\./,
        /customer_email/,
        /customer_phone/,
        /supervisor_phone/,
        /supervisor_email/,
        /internal_notes/,
        /\bquote_amount\b/,
        /project_description/,
      ]) {
        expect(src, `${key}:${bad}`).not.toMatch(bad);
      }
    },
  );

  it.each(Object.keys(sources))(
    "%s wrapper is read-only (no insert/update/delete/upsert/rpc)",
    (key) => {
      const src = sources[key];
      expect(src).not.toMatch(/\.insert\(/);
      expect(src).not.toMatch(/\.update\(/);
      expect(src).not.toMatch(/\.delete\(/);
      expect(src).not.toMatch(/\.upsert\(/);
      expect(src).not.toMatch(/supabase\.rpc\(/);
      expect(src).not.toMatch(/supabase\.channel\(/);
      expect(src).not.toMatch(/postgres_changes/);
    },
  );

  it("contract wrapper selects only sanitized fields", () => {
    const src = sources.contract;
    expect(src).toMatch(/from\("contracts"\)/);
    expect(src).toMatch(/title_ar/);
    expect(src).not.toMatch(/terms_ar/);
    expect(src).not.toMatch(/total_amount/);
  });

  it("lead wrapper omits PII fields entirely", () => {
    const src = sources.lead;
    expect(src).not.toMatch(/\bname\b/);
    expect(src).not.toMatch(/\bemail\b/);
    expect(src).not.toMatch(/\bphone\b/);
    expect(src).not.toMatch(/\bmessage\b/);
  });

  it("booking wrapper omits client identifiers", () => {
    const src = sources.booking;
    expect(src).not.toMatch(/client_name/);
    expect(src).not.toMatch(/client_phone/);
  });

  it("task wrapper joins parent work order for source_ref_id", () => {
    const src = sources.task;
    expect(src).toMatch(/work_orders!inner\(ref_id\)/);
    expect(src).toMatch(/source_ref_id/);
  });
});

/* ------------------------------------------------------------------ */
/* Resolver dispatch                                                   */
/* ------------------------------------------------------------------ */
describe("BUSINESS-ADMIN-4 — resolver delegates by prefix", () => {
  const resolver = read(FILES.resolver);

  it("imports every enrichment wrapper", () => {
    expect(resolver).toMatch(/getAdminContractSummaryByRef/);
    expect(resolver).toMatch(/getAdminQuoteSummaryByRef/);
    expect(resolver).toMatch(/getAdminLeadSummaryByRef/);
    expect(resolver).toMatch(/getAdminBookingSummaryByRef/);
    expect(resolver).toMatch(/getAdminBusinessSummaryByRef/);
    expect(resolver).toMatch(/getAdminTaskSummaryByRef/);
  });

  it("dispatches per official prefix", () => {
    for (const p of ["CNT", "QTE", "LED", "BKG", "ENT", "TASK"]) {
      expect(resolver).toContain(`"${p}"`);
    }
  });

  it("still rejects UUIDs via existing validator", () => {
    expect(resolver).toMatch(/UUID_SHAPE\.test/);
    expect(resolver).toMatch(/ADMIN_REF_OFFICIAL/);
  });
});

/* ------------------------------------------------------------------ */
/* Barrel + page                                                      */
/* ------------------------------------------------------------------ */
describe("BUSINESS-ADMIN-4 — admin barrel + page hygiene", () => {
  it("re-exports every wrapper through @/modules/admin", () => {
    const b = read(FILES.adminBarrel);
    for (const sym of [
      "getAdminContractSummaryByRef",
      "getAdminQuoteSummaryByRef",
      "getAdminLeadSummaryByRef",
      "getAdminBookingSummaryByRef",
      "getAdminBusinessSummaryByRef",
      "getAdminTaskSummaryByRef",
    ]) {
      expect(b).toContain(sym);
    }
  });

  it("page still has no direct supabase.from and keeps useNoIndex", () => {
    const p = read(FILES.page);
    expect(p).not.toMatch(/supabase\.from\(/);
    expect(p).toMatch(/useNoIndex\(\)/);
    // No destructive controls re-introduced
    for (const bad of [
      /onClick=\{[^}]*delete/i,
      /onClick=\{[^}]*reopen/i,
      /onClick=\{[^}]*force/i,
    ]) {
      expect(p).not.toMatch(bad);
    }
  });

  it("does not introduce notifications / realtime / cron imports", () => {
    for (const src of Object.values(FILES).map(read)) {
      expect(src).not.toMatch(/@\/modules\/notifications/);
      expect(src).not.toMatch(/supabase\.channel\(/);
      expect(src).not.toMatch(/postgres_changes/);
    }
  });

  it("does not touch auth/payment/membership modules", () => {
    for (const src of Object.values(FILES).map(read)) {
      expect(src).not.toMatch(/@\/modules\/auth/);
      expect(src).not.toMatch(/@\/modules\/payments/);
      expect(src).not.toMatch(/@\/modules\/memberships/);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Runtime: prefix routing + invalid input handling                    */
/* ------------------------------------------------------------------ */
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(async () => ({ data: [], error: null })),
    },
  };
});

function mockFrom(rowsByTable: Record<string, unknown>) {
  return (table: string) => {
    const row = rowsByTable[table] ?? null;
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      or: () => builder,
      is: () => builder,
      order: () => builder,
      limit: () => Promise.resolve({ data: row ? [row] : [], error: null }),
      maybeSingle: () => Promise.resolve({ data: row, error: null }),
    };
    return builder;
  };
}

describe("BUSINESS-ADMIN-4 — runtime safety", () => {
  beforeEach(async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
      mockFrom({}),
    );
    (supabase.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      error: null,
    });
  });

  it("rejects UUID via getAdminReferenceSummary", async () => {
    const { getAdminReferenceSummary } = await import(
      "../modules/admin/services/operations/getAdminReferenceSummary"
    );
    const res = await getAdminReferenceSummary({
      refId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(res.error).toBeNull();
    expect(res.data?.found).toBe(false);
  });

  it("returns null for non-matching prefix in each wrapper", async () => {
    const { getAdminContractSummaryByRef } = await import(
      "../modules/contracts/services/getAdminContractSummaryByRef"
    );
    const { getAdminQuoteSummaryByRef } = await import(
      "../modules/quotes/services/getAdminQuoteSummaryByRef"
    );
    const { getAdminLeadSummaryByRef } = await import(
      "../modules/leads/services/getAdminLeadSummaryByRef"
    );
    const { getAdminBookingSummaryByRef } = await import(
      "../modules/bookings/services/getAdminBookingSummaryByRef"
    );
    const { getAdminBusinessSummaryByRef } = await import(
      "../modules/businesses/services/getAdminBusinessSummaryByRef"
    );
    const { getAdminTaskSummaryByRef } = await import(
      "../modules/workOrders/services/getAdminTaskSummaryByRef"
    );
    const r = "WO-1";
    expect((await getAdminContractSummaryByRef({ refId: r })).data).toBeNull();
    expect((await getAdminQuoteSummaryByRef({ refId: r })).data).toBeNull();
    expect((await getAdminLeadSummaryByRef({ refId: r })).data).toBeNull();
    expect((await getAdminBookingSummaryByRef({ refId: r })).data).toBeNull();
    expect((await getAdminBusinessSummaryByRef({ refId: r })).data).toBeNull();
    expect((await getAdminTaskSummaryByRef({ refId: r })).data).toBeNull();
  });

  it("contract wrapper returns sanitized shape", async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    (supabase.from as ReturnType<typeof vi.fn>).mockImplementation(
      mockFrom({
        contracts: {
          id: "11111111-1111-1111-1111-111111111111",
          contract_number: "CNT-1000007",
          title_ar: "عقد تجريبي",
          title_en: null,
          status: "active",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
        },
      }),
    );
    const { getAdminContractSummaryByRef } = await import(
      "../modules/contracts/services/getAdminContractSummaryByRef"
    );
    const res = await getAdminContractSummaryByRef({ refId: "CNT-1000007" });
    expect(res.error).toBeNull();
    const d = res.data!;
    expect(d.ref_id).toBe("CNT-1000007");
    expect(d.entity_type).toBe("contract");
    expect(d.label).toBe("عقد تجريبي");
    expect(d.status).toBe("active");
    expect(d.canonical_route).toBe("/contracts/11111111-1111-1111-1111-111111111111");
    expect(Object.keys(d)).not.toContain("provider_intent_id");
  });
});