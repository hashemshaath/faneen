import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function read(p: string): string {
  return readFileSync(p, "utf8");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const full = join(dir, e);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e)) out.push(full);
  }
  return out;
}

/* ───────────── Part A — Conversion UI wiring ───────────── */

describe("BUSINESS-WORKFLOW-2: conversion buttons import wrappers from the module barrel", () => {
  it("lead button imports createWorkOrderFromLead", () => {
    const f = read(join(SRC, "components/workOrders/CreateWorkOrderFromLeadButton.tsx"));
    expect(f).toMatch(/createWorkOrderFromLead/);
    expect(f).toMatch(/@\/modules\/workOrders/);
    expect(f).not.toMatch(/supabase\.from\s*\(/);
  });
  it("quote button imports createWorkOrderFromQuote", () => {
    const f = read(join(SRC, "components/workOrders/CreateWorkOrderFromQuoteButton.tsx"));
    expect(f).toMatch(/createWorkOrderFromQuote/);
    expect(f).not.toMatch(/supabase\.from\s*\(/);
  });
  it("contract button imports createWorkOrderFromContract", () => {
    const f = read(join(SRC, "components/workOrders/CreateWorkOrderFromContractButton.tsx"));
    expect(f).toMatch(/createWorkOrderFromContract/);
    expect(f).not.toMatch(/supabase\.from\s*\(/);
  });
  it("booking button imports createWorkOrderFromBooking", () => {
    const f = read(join(SRC, "components/workOrders/CreateWorkOrderFromBookingButton.tsx"));
    expect(f).toMatch(/createWorkOrderFromBooking/);
    expect(f).not.toMatch(/supabase\.from\s*\(/);
  });

  it("source surfaces wire at least one of the conversion buttons", () => {
    const surfaces = [
      "pages/dashboard/ProviderLeadDetails.tsx",
      "pages/dashboard/DashboardBookings.tsx",
      "pages/ContractDetail.tsx",
    ];
    for (const rel of surfaces) {
      const f = read(join(SRC, rel));
      expect(f).toMatch(/CreateWorkOrderFrom(Lead|Quote|Contract|Booking)Button/);
    }
  });

  it("does NOT mutate contract / quote / booking lifecycle status from conversion buttons", () => {
    for (const name of [
      "CreateWorkOrderFromLeadButton",
      "CreateWorkOrderFromQuoteButton",
      "CreateWorkOrderFromContractButton",
      "CreateWorkOrderFromBookingButton",
    ]) {
      const f = read(join(SRC, `components/workOrders/${name}.tsx`));
      // No status writes / no contract lifecycle mutation
      expect(f).not.toMatch(/\.update\s*\(\s*\{[^}]*status/);
      expect(f).not.toMatch(/setContractStatus|updateContractStatus/);
    }
  });

  it("conversion buttons do not import notification / email / sms / realtime modules", () => {
    for (const name of [
      "CreateWorkOrderFromLeadButton",
      "CreateWorkOrderFromQuoteButton",
      "CreateWorkOrderFromContractButton",
      "CreateWorkOrderFromBookingButton",
    ]) {
      const f = read(join(SRC, `components/workOrders/${name}.tsx`));
      expect(f).not.toMatch(/notifications?\//i);
      expect(f).not.toMatch(/sendTransactionalEmail|email-queue|whatsapp|\/sms\//i);
      expect(f).not.toMatch(/supabase\.channel|postgres_changes/i);
    }
  });
});

/* ───────────── Part B — Duplicate prevention ───────────── */

describe("BUSINESS-WORKFLOW-2: duplicate prevention", () => {
  it("getWorkOrderBySource wrapper exists and is exported from the module barrel", () => {
    const svc = read(join(SRC, "modules/workOrders/services/getWorkOrderBySource.ts"));
    expect(svc).toMatch(/getWorkOrderBySource/);
    expect(svc).toMatch(/\.eq\("source_type"/);
    expect(svc).toMatch(/\.eq\("source_id"/);
    expect(svc).toMatch(/\.is\("deleted_at", null\)/);

    const barrel = read(join(SRC, "modules/workOrders/index.ts"));
    expect(barrel).toMatch(/getWorkOrderBySource/);
  });

  it("each conversion button calls useExistingWorkOrderForSource and renders an Open Work Order branch", () => {
    for (const name of [
      "CreateWorkOrderFromLeadButton",
      "CreateWorkOrderFromQuoteButton",
      "CreateWorkOrderFromContractButton",
      "CreateWorkOrderFromBookingButton",
    ]) {
      const f = read(join(SRC, `components/workOrders/${name}.tsx`));
      expect(f).toMatch(/useExistingWorkOrderForSource/);
      expect(f).toMatch(/Open Work Order|فتح أمر العمل/);
    }
  });

  it("partial unique index on (source_type, source_id) is declared in a migration", () => {
    const migrationsDir = join(ROOT, "supabase/migrations");
    const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql"));
    const hit = files.some((f) =>
      read(join(migrationsDir, f)).includes("uniq_work_orders_source_pair_active"),
    );
    expect(hit).toBe(true);
  });
});

/* ───────────── Part C — SLA visibility ───────────── */

describe("BUSINESS-WORKFLOW-2: SLA visibility (display-only)", () => {
  it("computeSlaState returns correct states", async () => {
    const { computeSlaState } = await import("@/modules/workOrders/lib/sla");
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);

    expect(
      computeSlaState({ status: "active", due_at: new Date(now - 1000).toISOString() }, now),
    ).toBe("overdue");
    expect(
      computeSlaState(
        { status: "active", due_at: new Date(now + 60 * 60 * 1000).toISOString() },
        now,
      ),
    ).toBe("due_soon");
    expect(computeSlaState({ status: "completed", due_at: null }, now)).toBe("completed");
    expect(computeSlaState({ status: "draft", due_at: null }, now)).toBe("none");
    expect(
      computeSlaState(
        { status: "active", due_at: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString() },
        now,
      ),
    ).toBe("on_track");
  });

  it("WorkOrderSlaBadge component exists and renders overdue/due_soon/completed", () => {
    const f = read(join(SRC, "components/workOrders/WorkOrderSlaBadge.tsx"));
    expect(f).toMatch(/overdue/);
    expect(f).toMatch(/due_soon/);
    expect(f).toMatch(/completed/);
  });

  it("SLA helpers do NOT introduce cron / scheduler / escalation / notifications", () => {
    const f = read(join(SRC, "modules/workOrders/lib/sla.ts"));
    expect(f).not.toMatch(/cron|scheduler|setInterval|setTimeout|escalat/i);
    expect(f).not.toMatch(/notifications?\//i);
    expect(f).not.toMatch(/supabase/);
  });
});

/* ───────────── Part D — Work Orders page polish ───────────── */

describe("BUSINESS-WORKFLOW-2: Work Orders page polish", () => {
  const page = read(join(SRC, "pages/dashboard/DashboardWorkOrders.tsx"));

  it("uses WorkOrderSourceBadge and WorkOrderSlaBadge", () => {
    expect(page).toMatch(/WorkOrderSourceBadge/);
    expect(page).toMatch(/WorkOrderSlaBadge/);
  });

  it("exposes status / priority / source / overdue filters", () => {
    expect(page).toMatch(/statusFilter/);
    expect(page).toMatch(/priorityFilter/);
    expect(page).toMatch(/sourceFilter/);
    expect(page).toMatch(/overdueOnly/);
  });

  it("keeps page hygiene — no direct supabase.from / no notification imports", () => {
    expect(page).not.toMatch(/supabase\.from\s*\(/);
    expect(page).not.toMatch(/notifications?\//i);
    expect(page).not.toMatch(/sendTransactionalEmail|email-queue|whatsapp/i);
    expect(page).not.toMatch(/supabase\.channel|postgres_changes/i);
  });

  it("does not render raw UUIDs as primary labels", () => {
    expect(page).not.toMatch(/>\s*\{[a-zA-Z_.]+\.id\}\s*</);
  });
});

/* ───────────── Security baseline ───────────── */

describe("BUSINESS-WORKFLOW-2: security baseline", () => {
  it("getWorkOrderBySource service has no anon or service-role bypass", () => {
    const f = read(join(SRC, "modules/workOrders/services/getWorkOrderBySource.ts"));
    expect(f).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE|anon/i);
  });

  it("conversion buttons do not write PII into audit metadata themselves", () => {
    // Audit metadata is built inside the createWorkOrderFrom* wrappers and
    // already verified by their own tests. Buttons must NOT pass raw phone /
    // email / national IDs through the description field.
    for (const name of [
      "CreateWorkOrderFromLeadButton",
      "CreateWorkOrderFromQuoteButton",
      "CreateWorkOrderFromContractButton",
      "CreateWorkOrderFromBookingButton",
    ]) {
      const f = read(join(SRC, `components/workOrders/${name}.tsx`));
      expect(f).not.toMatch(/national_id|nationalId|iban|cardNumber/i);
    }
  });

  it("no new component imports realtime / cron / kanban dnd libraries", () => {
    const files = walk(join(SRC, "components/workOrders"));
    for (const f of files) {
      const src = read(f);
      expect(src).not.toMatch(/@dnd-kit|react-beautiful-dnd|postgres_changes|supabase\.channel/);
      expect(src).not.toMatch(/cron|scheduler/i);
    }
  });
});