/**
 * Phase 4I — Work Order Taxonomy Display (UI-only).
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { WorkOrderOperationalSummary } from "@/components/workOrders/WorkOrderOperationalSummary";

function baseWo(overrides: Record<string, unknown> = {}) {
  return {
    id: "wo-1",
    ref_id: "WO-1000001",
    business_id: "biz-1",
    source_type: "manual",
    source_id: null,
    source_ref_id: null,
    title: "Test WO",
    customer_name: "Acme",
    customer_phone: null,
    status: "draft",
    current_stage_key: null,
    priority: "medium",
    owner_user_id: null,
    created_by_user_id: "u1",
    due_at: null,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deleted_at: null,
    taxonomy_category_id: null,
    ...overrides,
  } as unknown as React.ComponentProps<typeof WorkOrderOperationalSummary>["wo"];
}

function renderSummary(props: React.ComponentProps<typeof WorkOrderOperationalSummary>) {
  return render(
    <MemoryRouter>
      <WorkOrderOperationalSummary {...props} />
    </MemoryRouter>,
  );
}

describe("Phase 4I — work order taxonomy display", () => {
  it("renders Arabic taxonomy label when FK + label provided (RTL)", () => {
    renderSummary({
      wo: baseWo({ taxonomy_category_id: "cat-1" }),
      isRTL: true,
      taxonomyLabel: { ar: "أعمال الألمنيوم", en: "Aluminum Works" },
    });
    const el = screen.getByTestId("work-order-taxonomy-label");
    expect(el.textContent).toBe("أعمال الألمنيوم");
    expect(el.getAttribute("data-taxonomy-state")).toBe("classified");
  });

  it("renders English taxonomy label when FK + label provided (LTR)", () => {
    renderSummary({
      wo: baseWo({ taxonomy_category_id: "cat-1" }),
      isRTL: false,
      taxonomyLabel: { ar: "أعمال الألمنيوم", en: "Aluminum Works" },
    });
    expect(screen.getByTestId("work-order-taxonomy-label").textContent).toBe("Aluminum Works");
  });

  it("falls back to 'Classified' when FK present but label missing", () => {
    renderSummary({
      wo: baseWo({ taxonomy_category_id: "cat-1" }),
      isRTL: true,
      taxonomyLabel: null,
    });
    const el = screen.getByTestId("work-order-taxonomy-label");
    expect(el.textContent).toBe("مصنف");
    expect(el.getAttribute("data-taxonomy-state")).toBe("classified");
  });

  it("renders 'Unclassified' when no FK is present (Arabic)", () => {
    renderSummary({ wo: baseWo(), isRTL: true });
    const el = screen.getByTestId("work-order-taxonomy-label");
    expect(el.textContent).toBe("غير مصنف");
    expect(el.getAttribute("data-taxonomy-state")).toBe("unclassified");
  });

  it("renders 'Unclassified' when no FK is present (English)", () => {
    renderSummary({ wo: baseWo(), isRTL: false });
    expect(screen.getByTestId("work-order-taxonomy-label").textContent).toBe("Unclassified");
  });

  it("does not crash and does not mutate status/source on render", () => {
    const wo = baseWo({ status: "active", source_type: "contract", source_ref_id: "CNT-1000007" });
    renderSummary({ wo, isRTL: true });
    expect(screen.getByTestId("work-order-operational-summary")).toBeTruthy();
    expect((wo as { status: string }).status).toBe("active");
    expect((wo as { source_type: string }).source_type).toBe("contract");
  });
});