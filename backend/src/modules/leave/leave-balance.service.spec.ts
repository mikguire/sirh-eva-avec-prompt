import { NotFoundException } from "@nestjs/common";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LeaveBalanceService } from "./leave-balance.service";

describe("LeaveBalanceService", () => {
  it("throws when employee missing for sync", async () => {
    const prisma = {
      employee: { findFirst: jest.fn().mockResolvedValue(null) }
    } as unknown as PrismaService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const service = new LeaveBalanceService(prisma, audit);
    await expect(
      service.syncPaidLeaveAcquisitionsThroughYearMonth("t1", "e1", 2026, 5, "u1")
    ).rejects.toThrow(NotFoundException);
  });

  it("sumConsumedPaidWorkingDays sums approved deducting types", async () => {
    const prisma = {
      leaveRequest: {
        findMany: jest.fn().mockResolvedValue([
          { startDate: new Date("2026-06-01T12:00:00.000Z"), endDate: new Date("2026-06-05T12:00:00.000Z") }
        ])
      }
    } as unknown as PrismaService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const service = new LeaveBalanceService(prisma, audit);
    const sum = await service.sumConsumedPaidWorkingDays("t1", "e1");
    expect(sum).toBe(5);
    expect(prisma.leaveRequest.findMany).toHaveBeenCalled();
  });
});
