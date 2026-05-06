import { Employee } from "@prisma/client";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { EmployeesController } from "./employees.controller";
import { EmployeesService } from "./employees.service";

describe("EmployeesController", () => {
  const employeesService = {
    list: jest.fn(),
    create: jest.fn()
  } as unknown as jest.Mocked<EmployeesService>;
  const controller = new EmployeesController(employeesService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists employees for tenant context", async () => {
    const rows = [{ id: "e1", tenantId: "tenant_1" }] as Employee[];
    employeesService.list.mockResolvedValue(rows);

    const out = await controller.list({ tenantId: "tenant_1", userId: "u1" } as TenantContext);

    expect(out).toEqual(rows);
    expect(employeesService.list).toHaveBeenCalledWith("tenant_1");
  });

  it("creates employee for tenant and actor from context", async () => {
    const created = { id: "e2", tenantId: "tenant_1" } as Employee;
    employeesService.create.mockResolvedValue(created);

    const out = await controller.create(
      { tenantId: "tenant_1", userId: "actor_1" } as TenantContext,
      {
        workEmail: "employee@eva.test",
        firstName: "Eva",
        lastName: "Test",
        hireDate: "2026-01-01"
      }
    );

    expect(out).toEqual(created);
    expect(employeesService.create).toHaveBeenCalledWith("tenant_1", "actor_1", {
      workEmail: "employee@eva.test",
      firstName: "Eva",
      lastName: "Test",
      hireDate: "2026-01-01"
    });
  });
});
