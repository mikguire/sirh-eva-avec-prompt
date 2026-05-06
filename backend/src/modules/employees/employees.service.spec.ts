import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "../../common/audit/audit.service";
import { EmployeesService } from "./employees.service";

describe("EmployeesService", () => {
  it("lists employees for tenant", async () => {
    const prisma = {
      employee: { findMany: jest.fn().mockResolvedValue([{ id: "e1", tenantId: "t1" }]) }
    } as unknown as PrismaService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const service = new EmployeesService(prisma, audit);
    const rows = await service.list("t1");
    expect(rows).toHaveLength(1);
    expect(prisma.employee.findMany).toHaveBeenCalledWith({
      where: { tenantId: "t1" },
      orderBy: { createdAt: "desc" }
    });
  });

  it("creates employee and records audit", async () => {
    const created = {
      id: "e-new",
      tenantId: "t1",
      workEmail: "n@test.fr",
      firstName: "N",
      lastName: "M",
      hireDate: new Date("2025-01-01"),
      status: "ACTIVE",
      departmentId: null,
      positionId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const prisma = {
      employee: { create: jest.fn().mockResolvedValue(created) }
    } as unknown as PrismaService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const service = new EmployeesService(prisma, audit);
    const out = await service.create("t1", "actor1", {
      workEmail: "n@test.fr",
      firstName: "N",
      lastName: "M",
      hireDate: "2025-01-01"
    });
    expect(out.id).toBe("e-new");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "t1",
        actorUserId: "actor1",
        action: "employee.create"
      })
    );
  });
});
