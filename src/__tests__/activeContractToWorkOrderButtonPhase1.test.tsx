import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const createMock = vi.fn();
const getExistingMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock("@/modules/workOrders/services/createWorkOrderFromContract", () => ({
  createWorkOrderFromContract: (...a: unknown[]) => createMock(...a),
}));
vi.mock("@/modules/workOrders/services/getWorkOrderBySource", () => ({
  getWorkOrderBySource: (...a: unknown[]) => getExistingMock(...a),
}));
vi.mock("sonner", () => ({
  toast: {
    success: (m: string) => toastSuccessMock(m),
    error: (m: string) => toastErrorMock(m),
  },
}));
vi.mock("@/i18n/LanguageContext", () => ({
  useLanguage: () => ({ isRTL: true, language: "ar" }),
}));

import { CreateWorkOrderFromContractButton } from "@/components/workOrders/CreateWorkOrderFromContractButton";

function renderBtn(status: string | null | undefined) {
  return render(
    <MemoryRouter>
      <CreateWorkOrderFromContractButton
        contractId="contract-1"
        defaultTitle="Test Contract"
        contractStatus={status ?? null}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getExistingMock.mockResolvedValue({ data: null, error: null });
  createMock.mockResolvedValue({
    data: { id: "wo-1", ref_id: "WO-100", business_id: "b1" },
    error: null,
  });
});

describe("ACTIVE CONTRACT → WORK ORDER FLOW — Phase 1 button", () => {
  it("does not allow opening the create form for a draft contract", async () => {
    renderBtn("draft");
    const btn = await screen.findByRole("button", { name: /إنشاء أمر عمل/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("does not allow opening the create form for a pending_approval contract", async () => {
    renderBtn("pending_approval");
    const btn = await screen.findByRole("button", { name: /إنشاء أمر عمل/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders an enabled trigger only for an active contract", async () => {
    renderBtn("active");
    const btn = await screen.findByRole("button", { name: /إنشاء أمر عمل/ });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it("creates the work order, shows success toast and CTA on success", async () => {
    renderBtn("active");
    fireEvent.click(await screen.findByRole("button", { name: /إنشاء أمر عمل/ }));
    fireEvent.click(await screen.findByRole("button", { name: "إنشاء" }));
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: "contract-1" }),
    );
    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith("تم إنشاء أمر العمل"),
    );
    expect(await screen.findByText("WO-100")).toBeInTheDocument();
  });

  it("shows an 'open work order' link when one already exists for the contract", async () => {
    getExistingMock.mockResolvedValue({
      data: { id: "wo-x", ref_id: "WO-EXIST", business_id: "b1" },
      error: null,
    });
    renderBtn("active");
    const link = await screen.findByRole("link", { name: /عرض أمر العمل/ });
    expect(link.getAttribute("href")).toContain("/dashboard/work-orders/WO-EXIST");
    expect(createMock).not.toHaveBeenCalled();
  });

  it("prevents double submit while a creation request is in flight", async () => {
    let resolveCreate: (v: unknown) => void = () => {};
    createMock.mockImplementation(
      () => new Promise((r) => { resolveCreate = r; }),
    );
    renderBtn("active");
    fireEvent.click(await screen.findByRole("button", { name: /إنشاء أمر عمل/ }));
    const submit = await screen.findByRole("button", { name: "إنشاء" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    fireEvent.click(submit);
    resolveCreate({ data: { id: "wo-1", ref_id: "WO-100", business_id: "b1" }, error: null });
    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
  });

  it("the button component never performs a direct supabase insert (uses the service wrapper only)", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/workOrders/CreateWorkOrderFromContractButton.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/from\s+["']@\/integrations\/supabase\/client["']/);
    expect(src).not.toMatch(/\.from\(["']work_orders["']\)/);
    expect(src).not.toMatch(/service_role/i);
    expect(src).toMatch(/createWorkOrderFromContract/);
  });
});