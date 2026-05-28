import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const MIGRATIONS = join(ROOT, "supabase/migrations");

function read(p: string): string { return readFileSync(p, "utf8"); }
function findMigration(needle: string): string | null {
  if (!existsSync(MIGRATIONS)) return null;
  for (const f of readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql"))) {
    const src = read(join(MIGRATIONS, f));
    if (src.includes(needle)) return src;
  }
  return null;
}

/* ───────── Part A — SLA helpers ───────── */
describe("BUSINESS-WORKFLOW-3: SLA helpers", () => {
  it("isSlaActionable / getWorkOrderSlaBucket / getTaskSlaBucket behave per spec", async () => {
    const sla = await import("@/modules/workOrders/lib/sla");
    const now = Date.UTC(2026, 0, 15, 12, 0, 0);
    const iso = (ms: number) => new Date(ms).toISOString();

    // completed ignored
    expect(sla.getWorkOrderSlaBucket({ status: "completed", due_at: iso(now - 1000) }, now)).toBe("completed");
    // cancelled / deleted ignored
    expect(sla.getWorkOrderSlaBucket({ status: "cancelled", due_at: iso(now - 1000) }, now)).toBe("ignored");
    expect(sla.getWorkOrderSlaBucket({ status: "active", due_at: iso(now - 1000), deleted_at: iso(now) }, now)).toBe("ignored");
    // no due date → ignored
    expect(sla.getWorkOrderSlaBucket({ status: "active", due_at: null }, now)).toBe("ignored");
    // overdue / due_soon / on_track
    expect(sla.getWorkOrderSlaBucket({ status: "active", due_at: iso(now - 1000) }, now)).toBe("overdue");
    expect(sla.getWorkOrderSlaBucket({ status: "active", due_at: iso(now + 60_000) }, now)).toBe("due_soon");
    expect(sla.getWorkOrderSlaBucket({ status: "active", due_at: iso(now + 30 * 86400_000) }, now)).toBe("on_track");

    // Task variants honour archived / open-task statuses
    expect(sla.getTaskSlaBucket({ status: "archived", due_at: iso(now - 1000) }, now)).toBe("ignored");
    expect(sla.getTaskSlaBucket({ status: "in_progress", due_at: iso(now - 1000) }, now)).toBe("overdue");
    expect(sla.getTaskSlaBucket({ status: "completed", due_at: iso(now - 1000) }, now)).toBe("completed");
  });

  it("getSlaEscalationLevel mirrors the SQL processor exactly", async () => {
    const { getSlaEscalationLevel } = await import("@/modules/workOrders/lib/sla");
    const now = Date.UTC(2026, 0, 15, 12, 0, 0);
    const iso = (ms: number) => new Date(ms).toISOString();

    // none — too far away
    expect(getSlaEscalationLevel({ status: "active", due_at: iso(now + 5 * 86400_000) }, { now })).toBe("none");
    // due_soon — within 72h, not yet late
    expect(getSlaEscalationLevel({ status: "active", due_at: iso(now + 1 * 86400_000) }, { now })).toBe("due_soon");
    // overdue_1 — <3 days late
    expect(getSlaEscalationLevel({ status: "active", due_at: iso(now - 1 * 86400_000) }, { now })).toBe("overdue_1");
    // overdue_2 — 3 to <7 days late
    expect(getSlaEscalationLevel({ status: "active", due_at: iso(now - 4 * 86400_000) }, { now })).toBe("overdue_2");
    // overdue_3 — ≥7 days late
    expect(getSlaEscalationLevel({ status: "active", due_at: iso(now - 10 * 86400_000) }, { now })).toBe("overdue_3");
    // completed / no due / deleted → none
    expect(getSlaEscalationLevel({ status: "completed", due_at: iso(now - 1000) }, { now })).toBe("none");
    expect(getSlaEscalationLevel({ status: "active", due_at: null }, { now })).toBe("none");
    expect(getSlaEscalationLevel({ status: "active", due_at: iso(now - 1000), deleted_at: iso(now) }, { now })).toBe("none");
  });

  it("summariseWorkOrderSla counts buckets correctly", async () => {
    const { summariseWorkOrderSla } = await import("@/modules/workOrders/lib/sla");
    const now = Date.UTC(2026, 0, 15, 12, 0, 0);
    const iso = (ms: number) => new Date(ms).toISOString();
    const summary = summariseWorkOrderSla([
      { status: "active",    due_at: iso(now - 1000) },
      { status: "active",    due_at: iso(now + 60_000) },
      { status: "active",    due_at: iso(now + 30 * 86400_000) },
      { status: "completed", due_at: null },
      { status: "cancelled", due_at: iso(now - 1000) },
    ], now);
    expect(summary).toEqual({ overdue: 1, dueSoon: 1, onTrack: 1, completed: 1 });
  });
});

/* ───────── Part B — migration / table / processor ───────── */
describe("BUSINESS-WORKFLOW-3: migration creates table + processor", () => {
  const sql = findMigration("process_work_order_sla_due_items");
  it("migration file exists and defines table + processor", () => {
    expect(sql).not.toBeNull();
    expect(sql!).toMatch(/CREATE TABLE[^;]*public\.work_order_sla_events/);
    expect(sql!).toMatch(/CREATE OR REPLACE FUNCTION public\.process_work_order_sla_due_items/);
  });

  it("table grants are safe — no anon access", () => {
    expect(sql!).not.toMatch(/GRANT[\s\S]{0,80}public\.work_order_sla_events[\s\S]{0,80}TO anon/i);
    expect(sql!).toMatch(/GRANT SELECT ON public\.work_order_sla_events TO authenticated/);
    expect(sql!).toMatch(/GRANT ALL\s+ON public\.work_order_sla_events TO service_role/);
  });

  it("RLS enabled with member-only SELECT policy (no INSERT/UPDATE/DELETE policies)", () => {
    expect(sql!).toMatch(/ALTER TABLE public\.work_order_sla_events ENABLE ROW LEVEL SECURITY/);
    expect(sql!).toMatch(/CREATE POLICY wo_sla_events_select_member[\s\S]+is_work_order_member/);
    expect(sql!).not.toMatch(/CREATE POLICY[^;]+ON public\.work_order_sla_events[\s\S]*FOR INSERT/i);
    expect(sql!).not.toMatch(/CREATE POLICY[^;]+ON public\.work_order_sla_events[\s\S]*FOR UPDATE/i);
    expect(sql!).not.toMatch(/CREATE POLICY[^;]+ON public\.work_order_sla_events[\s\S]*FOR DELETE/i);
  });

  it("processor is SECURITY DEFINER, locked to service_role", () => {
    expect(sql!).toMatch(/SECURITY DEFINER/);
    expect(sql!).toMatch(/SET search_path = public/);
    expect(sql!).toMatch(/REVOKE ALL ON FUNCTION public\.process_work_order_sla_due_items\(\) FROM anon/);
    expect(sql!).toMatch(/REVOKE ALL ON FUNCTION public\.process_work_order_sla_due_items\(\) FROM authenticated/);
    expect(sql!).toMatch(/GRANT EXECUTE ON FUNCTION public\.process_work_order_sla_due_items\(\) TO service_role/);
  });

  it("idempotency_key is UNIQUE; ON CONFLICT prevents duplicate events", () => {
    expect(sql!).toMatch(/idempotency_key\s+text\s+NOT NULL\s+UNIQUE/);
    expect(sql!).toMatch(/ON CONFLICT \(idempotency_key\) DO NOTHING/);
  });

  it("processor only scans actionable rows (open statuses, not deleted, has due_at)", () => {
    expect(sql!).toMatch(/ARRAY\['draft','active','on_hold'\]/);
    expect(sql!).toMatch(/ARRAY\['todo','in_progress','blocked'\]/);
    expect(sql!).toMatch(/deleted_at IS NULL/);
    expect(sql!).toMatch(/due_at IS NOT NULL/);
  });

  it("processor does NOT mutate work_orders / tasks / contracts / payments / leads / quotes / bookings", () => {
    // Strip the safety-contract comment header so doc text doesn't trigger.
    const code = sql!.replace(/^--.*$/gm, "");
    expect(code).not.toMatch(/UPDATE\s+public\.work_orders/i);
    expect(code).not.toMatch(/UPDATE\s+public\.work_order_tasks/i);
    expect(code).not.toMatch(/UPDATE\s+public\.contracts/i);
    expect(code).not.toMatch(/UPDATE\s+public\.lead_requests/i);
    expect(code).not.toMatch(/UPDATE\s+public\.quote_requests/i);
    expect(code).not.toMatch(/UPDATE\s+public\.bookings/i);
    expect(code).not.toMatch(/payments?|installment_payments/i);
    // Notifications stay deferred — no insert into notifications from the processor.
    expect(code).not.toMatch(/INSERT\s+INTO\s+public\.notifications/i);
  });

  it("processor returns the expected summary envelope", () => {
    expect(sql!).toMatch(/'ok',\s*true/);
    expect(sql!).toMatch(/'scanned'/);
    expect(sql!).toMatch(/'events_created'/);
    expect(sql!).toMatch(/'notifications_created',\s*0/);
    expect(sql!).toMatch(/'skipped'/);
  });
});

/* ───────── Part D — UI ───────── */
describe("BUSINESS-WORKFLOW-3: dashboard SLA summary UI", () => {
  const page = read(join(SRC, "pages/dashboard/DashboardWorkOrders.tsx"));
  it("renders WorkOrderSlaSummaryCards on the work orders page", () => {
    expect(page).toMatch(/WorkOrderSlaSummaryCards/);
  });
  it("keeps existing overdue/status/priority/source filters", () => {
    expect(page).toMatch(/overdueOnly/);
    expect(page).toMatch(/statusFilter/);
    expect(page).toMatch(/priorityFilter/);
    expect(page).toMatch(/sourceFilter/);
  });
  it("summary card component has no realtime / notifications / supabase imports", () => {
    const cmp = read(join(SRC, "components/workOrders/WorkOrderSlaSummaryCards.tsx"));
    expect(cmp).not.toMatch(/supabase/);
    expect(cmp).not.toMatch(/postgres_changes|\.channel\(/);
    expect(cmp).not.toMatch(/notifications?\//i);
  });
});

/* ───────── Security baseline ───────── */
describe("BUSINESS-WORKFLOW-3: security baseline", () => {
  it("sla.ts has no I/O, no supabase, no notifications, no scheduler", () => {
    const f = read(join(SRC, "modules/workOrders/lib/sla.ts"));
    const code = f.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(code).not.toMatch(/supabase/);
    expect(code).not.toMatch(/\b(cron|scheduler|setInterval|setTimeout|escalate)\b/i);
    expect(code).not.toMatch(/from\s+["'][^"']*notifications?\//i);
    expect(code).not.toMatch(/whatsapp|sendTransactionalEmail|email-queue/i);
  });

  it("no new edge function or cron schedule was added in this phase", () => {
    // Phase recommends deferring cron; ensure we did NOT silently add one.
    const fnRoot = join(ROOT, "supabase/functions");
    if (existsSync(fnRoot)) {
      const dirs = readdirSync(fnRoot);
      expect(dirs).not.toContain("process-work-order-sla");
      expect(dirs).not.toContain("work-order-sla-cron");
    }
  });
});