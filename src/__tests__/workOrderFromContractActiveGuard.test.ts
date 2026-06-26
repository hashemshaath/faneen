import { describe, it, expect, vi, beforeEach } from "vitest";

const getContractByIdMock = vi.fn();
const createWorkOrderMock = vi.fn();
const getCurrentUserMock = vi.fn();
const recordWorkOrderAuditMock = vi.fn();
const recordBusinessSourceAuditMock = vi.fn();

vi.mock("@/modules/contracts/services/reads/getContractById", () => ({
  getContractById: (...a: unknown[]) => getContractByIdMock(...a),
}));
vi.mock("@/modules/identity/services/session/getCurrentUser", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUserMock(...a),
}));
vi.mock("@/modules/workOrders/services/createWorkOrder", () => ({
  createWorkOrder: (...a: unknown[]) => createWorkOrderMock(...a),
}));
vi.mock("@/modules/workOrders/services/recordWorkOrderAudit", () => ({
  recordWorkOrderAudit: (...a: unknown[]) => recordWorkOrderAuditMock(...a),
}));
vi.mock("@/modules/businesses/notes", () => ({
  recordBusinessSourceAudit: (...a: unknown[]) => recordBusinessSourceAuditMock(...a),
}));

import { createWorkOrderFromContract } from "@/modules/workOrders/services/createWorkOrderFromContract";

const BASE = {
  id: "00000000-0000-0000-0000-000000000001",
  business_id: "00000000-0000-0000-0000-0000000000b1",
  contract_number: "CNT-ABC123",
  title_ar: "عقد",
  title_en: "Contract",
};

function mockContract(status: string | null) {
  getContractByIdMock.mockResolvedValue({
    data: { ...BASE, status },
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({
    data: { user: { id: "00000000-0000-0000-0000-0000000000u1" } },
    error: null,
  });
  createWorkOrderMock.mockResolvedValue({
    data: { id: "wo1", business_id: BASE.business_id, ref_id: "WO-1" },
    error: null,
  });
});

describe("WORK ORDER CREATION ACTIVE CONTRACT GUARD", () => {
  for (const status of ["draft", "pending_approval", "completed", "cancelled", "disputed"]) {
    it(`rejects contract with status='${status}'`, async () => {
      mockContract(status);
      const res = await createWorkOrderFromContract({ contractId: BASE.id });
      expect(res.data).toBeNull();
      const err = res.error as { code?: string; user_message_ar?: string };
      expect(err?.code).toBe("CONTRACT_NOT_ACTIVE");
      expect(err?.user_message_ar).toContain("تفعيل العقد");
      expect(createWorkOrderMock).not.toHaveBeenCalled();
      expect(recordWorkOrderAuditMock).not.toHaveBeenCalled();
      expect(recordBusinessSourceAuditMock).not.toHaveBeenCalled();
    });
  }

  it("rejects when status is null/missing", async () => {
    mockContract(null);
    const res = await createWorkOrderFromContract({ contractId: BASE.id });
    expect((res.error as { code?: string })?.code).toBe("CONTRACT_NOT_ACTIVE");
    expect(createWorkOrderMock).not.toHaveBeenCalled();
  });

  it("allows contract with status='active'", async () => {
    mockContract("active");
    const res = await createWorkOrderFromContract({ contractId: BASE.id });
    expect(res.error).toBeNull();
    expect(res.data?.id).toBe("wo1");
    expect(createWorkOrderMock).toHaveBeenCalledTimes(1);
  });

  it("requests the status column from the contracts read wrapper", async () => {
    mockContract("active");
    await createWorkOrderFromContract({ contractId: BASE.id });
    const arg = getContractByIdMock.mock.calls[0][0] as { select: string };
    expect(arg.select).toMatch(/\bstatus\b/);
  });
});
