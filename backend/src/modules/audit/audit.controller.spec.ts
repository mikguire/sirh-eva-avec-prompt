import { AuditLog } from "@prisma/client";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { AuditController } from "./audit.controller";

describe("AuditController", () => {
  const findMany = jest.fn();
  const prisma = {
    auditLog: {
      findMany
    }
  } as never;

  const controller = new AuditController(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists audit logs for tenant with bounded limit", async () => {
    const rows = [{ id: "a1", tenantId: "tenant_1" }] as AuditLog[];
    findMany.mockResolvedValue(rows);

    const out = await controller.list(
      { tenantId: "tenant_1", userId: "u1" } as TenantContext,
      "500"
    );

    expect(out).toEqual(rows);
    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant_1" },
      orderBy: { createdAt: "desc" },
      take: 200
    });
  });

  it("uses default limit when absent", async () => {
    findMany.mockResolvedValue([] as AuditLog[]);

    await controller.list({ tenantId: "tenant_1", userId: "u1" } as TenantContext);

    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: "tenant_1" },
      orderBy: { createdAt: "desc" },
      take: 50
    });
  });
});
