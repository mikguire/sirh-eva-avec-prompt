import { PrismaService } from "../../prisma/prisma.service";
import { AuditService } from "./audit.service";

describe("AuditService", () => {
  it("records audit inside a transaction with tenant context", async () => {
    const tx = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
      auditLog: { create: jest.fn().mockResolvedValue({ id: "a1" }) }
    };
    const prisma = {
      $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx))
    } as unknown as PrismaService;
    const service = new AuditService(prisma);

    await service.record({
      tenantId: "ten_x",
      actorUserId: "u1",
      action: "test.action",
      entityType: "test",
      entityId: "e1"
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("set_config"),
      "ten_x"
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        tenantId: "ten_x",
        actorUserId: "u1",
        action: "test.action",
        entityType: "test",
        entityId: "e1"
      })
    });
  });
});
