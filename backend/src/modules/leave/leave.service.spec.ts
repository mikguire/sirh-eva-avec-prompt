import { NotFoundException } from "@nestjs/common";
import { LeaveRequestStatus } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LeaveService } from "./leave.service";

describe("LeaveService", () => {
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
    const service = new LeaveService(prisma, audit);
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

  it("approve throws when not found", async () => {
    const prisma = {
      leaveRequest: { findFirst: jest.fn().mockResolvedValue(null) }
    } as unknown as PrismaService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const service = new LeaveService(prisma, audit);
    await expect(service.approve("t1", "u1", "missing")).rejects.toThrow(NotFoundException);
  });

  it("approve updates status and audits", async () => {
    const existing = {
      id: "lr1",
      tenantId: "t1",
      employeeId: "e1",
      leaveTypeId: "lt1",
      startDate: new Date(),
      endDate: new Date(),
      status: LeaveRequestStatus.PENDING,
      approverId: null,
      reason: null,
      createdAt: new Date()
    };
    const updated = { ...existing, status: LeaveRequestStatus.APPROVED, approverId: "mgr1" };
    const prisma = {
      leaveRequest: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(updated)
      }
    } as unknown as PrismaService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const service = new LeaveService(prisma, audit);

    const out = await service.approve("t1", "mgr1", "lr1");
    expect(out.status).toBe(LeaveRequestStatus.APPROVED);
    expect(prisma.leaveRequest.update).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "leave_request.approve", actorUserId: "mgr1" })
    );
  });
});
