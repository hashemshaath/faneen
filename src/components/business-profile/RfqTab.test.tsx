import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RfqTab } from "./RfqTab";

// ── Mocks ────────────────────────────────────────────────────────────────

type InsertPayload = Record<string, unknown>;

const hoisted = vi.hoisted(() => {
  return {
    insertMock: vi.fn(async (_row: Record<string, unknown>) => ({ error: null })),
    useAuthMock: vi.fn(() => ({ user: null as unknown })),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
  };
});
const { insertMock, useAuthMock, toastSuccess, toastError } = hoisted;

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({ insert: hoisted.insertMock })),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => hoisted.useAuthMock(),
}));

vi.mock("@/components/common/Bilingual", () => ({
  useBi: () => (ar: string) => ar,
  Bi: ({ ar }: { ar: string; en: string }) => ar,
}));

vi.mock("sonner", () => ({
  toast: { success: hoisted.toastSuccess, error: hoisted.toastError },
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

// shadcn `<Label>` and `<Input>` are siblings without htmlFor/id wiring, so
// `getByLabelText` can't find them. We resolve labels by visible text and
// pick the first sibling input/textarea in the same group.
const inputForLabel = (label: RegExp): HTMLInputElement | HTMLTextAreaElement => {
  const labelEl = screen.getByText(label);
  const container = labelEl.closest("div");
  const field = container?.querySelector("input, textarea");
  if (!field) throw new Error(`No input found for label matching ${label}`);
  return field as HTMLInputElement | HTMLTextAreaElement;
};

const setField = (label: RegExp, value: string) =>
  fireEvent.change(inputForLabel(label), { target: { value } });

const fillRequired = () => {
  setField(/^الاسم$/, "أحمد");
  setField(/^الجوال$/, "0555555555");
  setField(/^عنوان الطلب$/, "تركيب واجهات ألمنيوم لمشروع تجاري");
  setField(/^الوصف التفصيلي$/, "مساحة 200 متر، تنفيذ خلال شهرين، مع الزجاج المعزول.");
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
    expect(screen.getByText(/^الاسم$/)).toBeInTheDocument();
    expect(screen.getByText(/^البريد الإلكتروني$/)).toBeInTheDocument();
  });

  it("hides guest name/email fields when a user is authenticated", () => {
    useAuthMock.mockReturnValue({
      user: { id: "u-1", email: "a@b.com", user_metadata: { full_name: "Sara" } },
    });
    renderTab();
    expect(screen.queryByText(/^البريد الإلكتروني$/)).not.toBeInTheDocument();
  });

  it("rejects submissions when phone is empty", async () => {
    renderTab();
    setField(/^الاسم$/, "أحمد");
    setField(/^عنوان الطلب$/, "عنوان كافٍ للطلب");
    setField(/^الوصف التفصيلي$/, "وصف تفصيلي طويل بما يكفي للاختبار");
    clickSubmit();
    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  it("rejects submissions when the description is too short", async () => {
    renderTab();
    setField(/^الاسم$/, "أحمد");
    setField(/^الجوال$/, "0555555555");
    setField(/^عنوان الطلب$/, "عنوان كافٍ");
    setField(/^الوصف التفصيلي$/, "قصير");
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
    setField(/^الجوال$/, "0512345678");
    setField(/^عنوان الطلب$/, "تركيب أبواب زجاجية");
    setField(/^الوصف التفصيلي$/, "خمسة أبواب زجاج مقسّى، مع المقابض والإكسسوارات.");
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
    setField(/الميزانية من/, "10000");
    setField(/الميزانية إلى/, "25000");
    clickSubmit();
    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    const payload = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.has_budget).toBe(true);
    expect(payload.budget_amount).toBe(25000);
    expect(payload.budget_note).toBe("10000 - 25000");
  });
});