import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RfqTab } from "./RfqTab";

// ── Mocks ────────────────────────────────────────────────────────────────

type InsertPayload = Record<string, unknown>;
const insertMock = vi.fn(async (_row: InsertPayload) => ({ error: null }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ insert: insertMock })),
  },
}));

const useAuthMock = vi.fn(() => ({ user: null as unknown }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/components/common/Bilingual", () => ({
  useBi: () => (ar: string) => ar,
  Bi: ({ ar }: { ar: string; en: string }) => ar,
}));

const toastSuccess = vi.fn();
const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

// ── Helpers ──────────────────────────────────────────────────────────────

const renderTab = (overrides: Partial<React.ComponentProps<typeof RfqTab>> = {}) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RfqTab
        businessId="biz-1"
        businessName="شركة الاختبار"
        sector="aluminum"
        city="الرياض"
        {...overrides}
      />
    </QueryClientProvider>,
  );
};

const fillRequired = () => {
  fireEvent.change(screen.getByLabelText(/الاسم/i), { target: { value: "أحمد" } });
  fireEvent.change(screen.getByLabelText(/الجوال/i), { target: { value: "0555555555" } });
  fireEvent.change(screen.getByLabelText(/عنوان الطلب/i), {
    target: { value: "تركيب واجهات ألمنيوم لمشروع تجاري" },
  });
  fireEvent.change(screen.getByLabelText(/الوصف التفصيلي/i), {
    target: { value: "مساحة 200 متر، تنفيذ خلال شهرين، مع الزجاج المعزول." },
  });
};

const clickSubmit = () => {
  fireEvent.click(screen.getByRole("button", { name: /إرسال الطلب/i }));
};

beforeEach(() => {
  insertMock.mockClear();
  toastSuccess.mockClear();
  toastError.mockClear();
  useAuthMock.mockReturnValue({ user: null });
});

// ── Tests ────────────────────────────────────────────────────────────────

describe("RfqTab", () => {
  it("renders the form heading and name/email fields for guests", () => {
    renderTab();
    expect(screen.getByText(/اطلب عرض سعر/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/الاسم/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/البريد الإلكتروني/i)).toBeInTheDocument();
  });

  it("hides guest name/email fields when a user is authenticated", () => {
    useAuthMock.mockReturnValue({
      user: { id: "u-1", email: "a@b.com", user_metadata: { full_name: "Sara" } },
    });
    renderTab();
    expect(screen.queryByLabelText(/البريد الإلكتروني/i)).not.toBeInTheDocument();
  });

  it("rejects submissions when phone is empty", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText(/الاسم/i), { target: { value: "أحمد" } });
    fireEvent.change(screen.getByLabelText(/عنوان الطلب/i), {
      target: { value: "عنوان كافٍ للطلب" },
    });
    fireEvent.change(screen.getByLabelText(/الوصف التفصيلي/i), {
      target: { value: "وصف تفصيلي طويل بما يكفي للاختبار" },
    });
    clickSubmit();
    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  it("rejects submissions when the description is too short", async () => {
    renderTab();
    fireEvent.change(screen.getByLabelText(/الاسم/i), { target: { value: "أحمد" } });
    fireEvent.change(screen.getByLabelText(/الجوال/i), { target: { value: "0555555555" } });
    fireEvent.change(screen.getByLabelText(/عنوان الطلب/i), { target: { value: "عنوان كافٍ" } });
    fireEvent.change(screen.getByLabelText(/الوصف التفصيلي/i), { target: { value: "قصير" } });
    clickSubmit();
    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  it("submits a valid RFQ as a guest and shows the success screen", async () => {
    renderTab();
    fillRequired();
    clickSubmit();
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
    });
    const payload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      target_entity_id: "biz-1",
      customer_name: "أحمد",
      customer_phone: "0555555555",
      customer_type: "individual",
      sector: "aluminum",
      city: "الرياض",
      source: "business_profile_rfq",
      user_id: null,
    });
    expect(payload.project_description).toContain("تركيب واجهات");
    expect(payload.project_description).toContain("مساحة 200 متر");
    expect(toastSuccess).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/تم استلام طلبك/i)).toBeInTheDocument();
    });
  });

  it("attaches the user_id and uses metadata name when authenticated", async () => {
    useAuthMock.mockReturnValue({
      user: { id: "u-42", email: "a@b.com", user_metadata: { full_name: "سارة" } },
    });
    renderTab();
    fireEvent.change(screen.getByLabelText(/الجوال/i), { target: { value: "0512345678" } });
    fireEvent.change(screen.getByLabelText(/عنوان الطلب/i), {
      target: { value: "تركيب أبواب زجاجية" },
    });
    fireEvent.change(screen.getByLabelText(/الوصف التفصيلي/i), {
      target: { value: "خمسة أبواب زجاج مقسّى، مع المقابض والإكسسوارات." },
    });
    clickSubmit();
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledTimes(1);
    });
    const payload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      user_id: "u-42",
      customer_name: "سارة",
      customer_email: "a@b.com",
    });
  });

  it("computes budget_amount and budget_note when both bounds are supplied", async () => {
    renderTab();
    fillRequired();
    fireEvent.change(screen.getByLabelText(/الميزانية من/i), { target: { value: "10000" } });
    fireEvent.change(screen.getByLabelText(/الميزانية إلى/i), { target: { value: "25000" } });
    clickSubmit();
    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    const payload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.has_budget).toBe(true);
    expect(payload.budget_amount).toBe(25000);
    expect(payload.budget_note).toBe("10000 - 25000");
  });
});