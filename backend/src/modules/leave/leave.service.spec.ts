import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { LeaveRequestStatus } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LeaveBalanceService } from "./leave-balance.service";
import { LeaveService } from "./leave.service";

describe("LeaveService", () => {
  const leaveBalanceService = {
    getBalanceSnapshotForEmployee: jest.fn()
  } as unknown as jest.Mocked<LeaveBalanceService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates leave request and audits", async () => {
    const created = {
      id: "lr1",
      tenantId: "t1",
      employeeId: "e1",
      leaveTypeId: "lt1",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-05"),
      status: LeaveRequestStatus.PENDING,
      approverId: null,
      reason: "r",
      createdAt: new Date()
    };
    const prisma = {
      leaveRequest: { create: jest.fn().mockResolvedValue(created) }
    } as unknown as PrismaService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const service = new LeaveService(prisma, audit, leaveBalanceService);
    const out = await service.create("t1", "u1", {
      employeeId: "e1",
      leaveTypeId: "lt1",
      startDate: "2026-01-01",
      endDate: "2026-01-05",
      reason: "r"
    });
    expect(out.id).toBe("lr1");
    expect(audit.record).toHaveBeenCalled();
  });

  it("create rejects inverted date range", async () => {
    const prisma = { leaveRequest: { create: jest.fn() } } as unknown as PrismaService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const service = new LeaveService(prisma, audit, leaveBalanceService);
    await expect(
      service.create("t1", "u1", {
        employeeId: "e1",
        leaveTypeId: "lt1",
        startDate: "2026-06-10",
        endDate: "2026-06-01",
        reason: "x"
      })
    ).rejects.toThrow(BadRequestException);
    expect(prisma.leaveRequest.create).not.toHaveBeenCalled();
  });

  it("approve throws when not found", async () => {
    const prisma = {
      leaveRequest: { findFirst: jest.fn().mockResolvedValue(null) }
    } as unknown as PrismaService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const service = new LeaveService(prisma, audit, leaveBalanceService);
    await expect(service.approve("t1", "u1", "missing")).rejects.toThrow(NotFoundException);
  });

  it("approve rejects overlap", async () => {
    const existing = {
      id: "lr1",
      tenantId: "t1",
      employeeId: "e1",
      leaveTypeId: "lt1",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-05"),
      status: LeaveRequestStatus.PENDING,
      approverId: null,
      reason: null,
      createdAt: new Date(),
      leaveType: { deductsPaidBalance: false }
    };
    const prisma = {
      leaveRequest: {
        findFirst: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce({ id: "other" }),
        update: jest.fn()
      }
    } as unknown as PrismaService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const service = new LeaveService(prisma, audit, leaveBalanceService);
    await expect(service.approve("t1", "mgr1", "lr1")).rejects.toThrow(ConflictException);
    expect(prisma.leaveRequest.update).not.toHaveBeenCalled();
  });

  it("approve rejects insufficient paid balance", async () => {
    const existing = {
      id: "lr1",
      tenantId: "t1",
      employeeId: "e1",
      leaveTypeId: "lt1",
      startDate: new Date("2026-06-02"),
      endDate: new Date("2026-06-06"),
      status: LeaveRequestStatus.PENDING,
      approverId: null,
      reason: null,
      createdAt: new Date(),
      leaveType: { deductsPaidBalance: true }
    };
    const prisma = {
      leaveRequest: {
        findFirst: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(null),
        update: jest.fn()
      }
    } as unknown as PrismaService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    leaveBalanceService.getBalanceSnapshotForEmployee.mockResolvedValue({
      availablePaidDays: 2,
      accruedPaidDays: 2,
      carriedOverDays: 0,
      consumedPaidDays: 0,
      expiredCarryDays: 0,
      acquisitionRatePerFullMonth: 2.5,
      carryOverCapDays: 30,
      carryOverEnabled: true,
      employeeId: "e1",
      tenantId: "t1",
      syncedThroughYearMonth: "2026-06"
    });
    const service = new LeaveService(prisma, audit, leaveBalanceService);
    await expect(service.approve("t1", "mgr1", "lr1")).rejects.toThrow(ConflictException);
    expect(prisma.leaveRequest.update).not.toHaveBeenCalled();
  });

  it("approve updates status and audits when balance sufficient", async () => {
    const existing = {
      id: "lr1",
      tenantId: "t1",
      employeeId: "e1",
      leaveTypeId: "lt1",
      startDate: new Date("2026-06-02"),
      endDate: new Date("2026-06-03"),
      status: LeaveRequestStatus.PENDING,
      approverId: null,
      reason: null,
      createdAt: new Date(),
      leaveType: { deductsPaidBalance: true }
    };
    const updated = { ...existing, status: LeaveRequestStatus.APPROVED, approverId: "mgr1" };
    const prisma = {
      leaveRequest: {
        findFirst: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(null),
        update: jest.fn().mockResolvedValue(updated)
      }
    } as unknown as PrismaService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    leaveBalanceService.getBalanceSnapshotForEmployee.mockResolvedValue({
      availablePaidDays: 50,
      accruedPaidDays: 50,
      carriedOverDays: 0,
      consumedPaidDays: 0,
      expiredCarryDays: 0,
      acquisitionRatePerFullMonth: 2.5,
      carryOverCapDays: 30,
      carryOverEnabled: true,
      employeeId: "e1",
      tenantId: "t1",
      syncedThroughYearMonth: "2026-06"
    });
    const service = new LeaveService(prisma, audit, leaveBalanceService);

    const out = await service.approve("t1", "mgr1", "lr1");
    expect(out.status).toBe(LeaveRequestStatus.APPROVED);
    expect(prisma.leaveRequest.update).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "leave_request.approve", actorUserId: "mgr1" })
    );
  });

  it("approve skips balance check when type does not deduct paid leave", async () => {
    const existing = {
      id: "lr1",
      tenantId: "t1",
      employeeId: "e1",
      leaveTypeId: "lt1",
      startDate: new Date("2026-06-02"),
      endDate: new Date("2026-06-03"),
      status: LeaveRequestStatus.PENDING,
      approverId: null,
      reason: null,
      createdAt: new Date(),
      leaveType: { deductsPaidBalance: false }
    };
    const updated = { ...existing, status: LeaveRequestStatus.APPROVED, approverId: "mgr1" };
    const prisma = {
      leaveRequest: {
        findFirst: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(null),
        update: jest.fn().mockResolvedValue(updated)
      }
    } as unknown as PrismaService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const service = new LeaveService(prisma, audit, leaveBalanceService);

    await service.approve("t1", "mgr1", "lr1");
    expect(leaveBalanceService.getBalanceSnapshotForEmployee).not.toHaveBeenCalled();
  });
});
