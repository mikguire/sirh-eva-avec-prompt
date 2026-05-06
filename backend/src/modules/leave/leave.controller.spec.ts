import { LeaveRequest, LeaveRequestStatus } from "@prisma/client";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { LeaveController } from "./leave.controller";
import { LeaveService } from "./leave.service";

describe("LeaveController", () => {
  const leaveService = {
    create: jest.fn(),
    approve: jest.fn()
  } as unknown as jest.Mocked<LeaveService>;
  const controller = new LeaveController(leaveService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates leave request using tenant context", async () => {
    const created = { id: "lr1", status: LeaveRequestStatus.PENDING } as LeaveRequest;
    leaveService.create.mockResolvedValue(created);

    const dto = {
      employeeId: "emp_1",
      leaveTypeId: "lt_1",
      startDate: "2026-06-10",
      endDate: "2026-06-15",
      reason: "annual"
    };

    const out = await controller.create({ tenantId: "tenant_1", userId: "actor_1" } as TenantContext, dto);

    expect(out).toEqual(created);
    expect(leaveService.create).toHaveBeenCalledWith("tenant_1", "actor_1", dto);
  });

  it("approves leave request with approver from context", async () => {
    const updated = { id: "lr1", status: LeaveRequestStatus.APPROVED } as LeaveRequest;
    leaveService.approve.mockResolvedValue(updated);

    const out = await controller.approve(
      { tenantId: "tenant_1", userId: "manager_1" } as TenantContext,
      "lr1"
    );

    expect(out).toEqual(updated);
    expect(leaveService.approve).toHaveBeenCalledWith("tenant_1", "manager_1", "lr1");
  });

  it("approves leave with empty fallback user id when missing", async () => {
    const updated = { id: "lr2", status: LeaveRequestStatus.APPROVED } as LeaveRequest;
    leaveService.approve.mockResolvedValue(updated);

    await controller.approve({ tenantId: "tenant_1" } as TenantContext, "lr2");

    expect(leaveService.approve).toHaveBeenCalledWith("tenant_1", "", "lr2");
  });
});
