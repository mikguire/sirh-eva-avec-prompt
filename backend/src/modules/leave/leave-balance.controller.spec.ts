import { NotFoundException } from "@nestjs/common";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { LeaveBalanceSnapshotDto } from "./dto/leave-balance-response.dto";
import { LeaveBalanceController } from "./leave-balance.controller";
import { LeaveBalanceService } from "./leave-balance.service";

describe("LeaveBalanceController", () => {
  const balanceService = {
    findEmployeeLinkedToUser: jest.fn(),
    getBalanceSnapshotForEmployee: jest.fn()
  } as unknown as jest.Mocked<LeaveBalanceService>;

  const controller = new LeaveBalanceController(balanceService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("getMyBalance resolves linked employee", async () => {
    balanceService.findEmployeeLinkedToUser.mockResolvedValue({ id: "emp1" } as never);
    balanceService.getBalanceSnapshotForEmployee.mockResolvedValue({
      employeeId: "emp1"
    } as LeaveBalanceSnapshotDto);

    const out = await controller.getMyBalance({
      tenantId: "t1",
      userId: "u1"
    } as TenantContext);

    expect(out.employeeId).toBe("emp1");
    expect(balanceService.getBalanceSnapshotForEmployee).toHaveBeenCalledWith("t1", "emp1", "u1");
  });

  it("getMyBalance throws when no linked employee", async () => {
    balanceService.findEmployeeLinkedToUser.mockResolvedValue(null);

    await expect(
      controller.getMyBalance({ tenantId: "t1", userId: "u1" } as TenantContext)
    ).rejects.toThrow(NotFoundException);
  });

  it("getBalanceForEmployee delegates with read_any permission guard implied", async () => {
    balanceService.getBalanceSnapshotForEmployee.mockResolvedValue({
      employeeId: "emp2"
    } as LeaveBalanceSnapshotDto);

    const out = await controller.getBalanceForEmployee(
      { tenantId: "t1", userId: "admin1" } as TenantContext,
      "emp2"
    );

    expect(out.employeeId).toBe("emp2");
    expect(balanceService.getBalanceSnapshotForEmployee).toHaveBeenCalledWith("t1", "emp2", "admin1");
  });
});
