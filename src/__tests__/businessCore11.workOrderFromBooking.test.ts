import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWorkOrderFromBooking } from "@/modules/workOrders/services/createWorkOrderFromBooking";
import { createWorkOrder } from "@/modules/workOrders/services/createWorkOrder";
import { recordWorkOrderAudit } from "@/modules/workOrders/services/recordWorkOrderAudit";
import { getCurrentUser } from "@/modules/identity/services/session/getCurrentUser";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/modules/workOrders/services/createWorkOrder");
vi.mock("@/modules/workOrders/services/recordWorkOrderAudit");
vi.mock("@/modules/identity/services/session/getCurrentUser");
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
    })),
  },
}));

describe("BUSINESS-CORE-11 — Create Work Order from Booking", () => {
  const uid = "usr-123";
  const bookingId = "bkg-uuid-1";
  const businessId = "biz-1";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue({
      data: { user: { id: uid } },
      error: null,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockBookingRow(row: Record<string, unknown> | null, error: unknown = null) {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);
  }

  it("requires bookingId", async () => {
    const { data, error } = await createWorkOrderFromBooking({ bookingId: "" });
    expect(data).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("booking_id_required");
  });

  it("requires authentication", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ data: { user: null }, error: null } as any);
    mockBookingRow({ id: bookingId, business_id: businessId, ref_id: "BKG-1000001" });
    const { error } = await createWorkOrderFromBooking({ bookingId });
    expect((error as Error).message).toBe("not_authenticated");
  });

  it("returns error when booking not found or no access", async () => {
    mockBookingRow(null);
    const { data, error } = await createWorkOrderFromBooking({ bookingId });
    expect(data).toBeNull();
    expect((error as Error).message).toBe("booking_not_found_or_no_access");
  });

  it("rejects explicit businessId that does not match booking.business_id", async () => {
    mockBookingRow({ id: bookingId, business_id: businessId, ref_id: "BKG-1000001" });
    const { data, error } = await createWorkOrderFromBooking({
      bookingId,
      businessId: "biz-other",
    });
    expect(data).toBeNull();
    expect((error as Error).message).toBe("business_id_mismatch");
  });

  it("delegates to createWorkOrder with source_type='booking' and safe source_ref_id", async () => {
    mockBookingRow({
      id: bookingId,
      business_id: businessId,
      ref_id: "BKG-1000001",
      client_name: "Ahmed",
      notes: null,
      booking_date: "2026-05-28",
      start_time: "10:00:00",
    });
    vi.mocked(createWorkOrder).mockResolvedValue({
      data: {
        id: "wo-uuid-1",
        ref_id: "WO-1000099",
        business_id: businessId,
        source_type: "booking",
        source_id: bookingId,
        source_ref_id: "BKG-1000001",
      } as any,
      error: null,
    });

    const { data, error } = await createWorkOrderFromBooking({ bookingId });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(createWorkOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        source_type: "booking",
        source_id: bookingId,
        source_ref_id: "BKG-1000001",
        business_id: businessId,
        customer_name: "Ahmed",
      }),
    );
  });

  it("does not invent source_ref_id for invalid ref", async () => {
    mockBookingRow({
      id: bookingId,
      business_id: businessId,
      ref_id: "bad",
      client_name: null,
      notes: null,
      booking_date: "2026-05-28",
      start_time: "10:00:00",
    });
    vi.mocked(createWorkOrder).mockResolvedValue({
      data: {
        id: "wo-uuid-2",
        ref_id: "WO-1000100",
        business_id: businessId,
        source_type: "booking",
        source_id: bookingId,
        source_ref_id: null,
      } as any,
      error: null,
    });

    await createWorkOrderFromBooking({ bookingId });

    expect(createWorkOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        source_ref_id: null,
      }),
    );
  });

  it("does not invent source_ref_id when ref_id is missing", async () => {
    mockBookingRow({
      id: bookingId,
      business_id: businessId,
      ref_id: null,
      client_name: null,
      notes: null,
      booking_date: "2026-05-28",
      start_time: "10:00:00",
    });
    vi.mocked(createWorkOrder).mockResolvedValue({
      data: {
        id: "wo-uuid-3",
        ref_id: "WO-1000101",
        business_id: businessId,
        source_type: "booking",
        source_id: bookingId,
        source_ref_id: null,
      } as any,
      error: null,
    });

    await createWorkOrderFromBooking({ bookingId });

    expect(createWorkOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        source_ref_id: null,
      }),
    );
  });

  it("emits work_order.created_from_booking audit event", async () => {
    mockBookingRow({
      id: bookingId,
      business_id: businessId,
      ref_id: "BKG-1000002",
      client_name: null,
      notes: null,
      booking_date: "2026-05-28",
      start_time: "10:00:00",
    });
    vi.mocked(createWorkOrder).mockResolvedValue({
      data: {
        id: "wo-uuid-4",
        ref_id: "WO-1000102",
        business_id: businessId,
      } as any,
      error: null,
    });
    vi.mocked(recordWorkOrderAudit).mockResolvedValue(undefined);

    await createWorkOrderFromBooking({ bookingId });

    expect(recordWorkOrderAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "work_order.created_from_booking",
        entity_id: "wo-uuid-4",
        actor_id: uid,
      }),
    );
  });

  it("uses explicit businessId when booking.business_id is null", async () => {
    mockBookingRow({
      id: bookingId,
      business_id: null,
      ref_id: "BKG-1000003",
      client_name: null,
      notes: null,
      booking_date: "2026-05-28",
      start_time: "10:00:00",
    });
    vi.mocked(createWorkOrder).mockResolvedValue({
      data: {
        id: "wo-uuid-5",
        ref_id: "WO-1000103",
        business_id: "biz-explicit",
      } as any,
      error: null,
    });

    const { data } = await createWorkOrderFromBooking({
      bookingId,
      businessId: "biz-explicit",
    });

    expect(data).not.toBeNull();
    expect(createWorkOrder).toHaveBeenCalledWith(
      expect.objectContaining({ business_id: "biz-explicit" }),
    );
  });

  it("prefers input.title over booking-derived title", async () => {
    mockBookingRow({
      id: bookingId,
      business_id: businessId,
      ref_id: "BKG-1000004",
      client_name: "Customer",
      notes: null,
      booking_date: "2026-05-28",
      start_time: "10:00:00",
    });
    vi.mocked(createWorkOrder).mockResolvedValue({
      data: { id: "wo-uuid-6", ref_id: "WO-1000104", business_id: businessId } as any,
      error: null,
    });

    await createWorkOrderFromBooking({
      bookingId,
      title: "Custom Title",
    });

    expect(createWorkOrder).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Custom Title" }),
    );
  });

  it("falls back to date/time title when client_name is absent", async () => {
    mockBookingRow({
      id: bookingId,
      business_id: businessId,
      ref_id: "BKG-1000005",
      client_name: null,
      notes: null,
      booking_date: "2026-05-28",
      start_time: "14:30:00",
    });
    vi.mocked(createWorkOrder).mockResolvedValue({
      data: { id: "wo-uuid-7", ref_id: "WO-1000105", business_id: businessId } as any,
      error: null,
    });

    await createWorkOrderFromBooking({ bookingId });

    const callArg = vi.mocked(createWorkOrder).mock.calls[0][0];
    expect(callArg.title).toContain("28");
    expect(callArg.title).toContain("14:30");
  });

  it("passes description to audit metadata", async () => {
    mockBookingRow({
      id: bookingId,
      business_id: businessId,
      ref_id: "BKG-1000006",
      client_name: null,
      notes: null,
      booking_date: "2026-05-28",
      start_time: "10:00:00",
    });
    vi.mocked(createWorkOrder).mockResolvedValue({
      data: { id: "wo-uuid-8", ref_id: "WO-1000106", business_id: businessId } as any,
      error: null,
    });

    await createWorkOrderFromBooking({
      bookingId,
      description: "Follow-up needed",
    });

    expect(recordWorkOrderAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ description: "Follow-up needed" }),
      }),
    );
  });

  it("does not import automation, realtime, notification, or cron modules", () => {
    const source = createWorkOrderFromBooking.toString();
    const forbidden = ["realtime", "cron", "notification", "automation"];
    for (const f of forbidden) {
      expect(source.toLowerCase()).not.toContain(f);
    }
  });
});
