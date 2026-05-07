import { TenantContext } from "../../common/tenancy/tenant-context";
import { PayrollBfController } from "./payroll-bf.controller";
import { PayrollBfService } from "./payroll-bf.service";

describe("PayrollBfController", () => {
  const payrollBfService = {
    simulate: jest.fn()
  } as unknown as jest.Mocked<PayrollBfService>;

  const controller = new PayrollBfController(payrollBfService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("forwards tenant/user context and payload to service", async () => {
    const result = {
      legalVersionId: "BF-2026-01",
      currency: "XOF" as const,
      grossTaxableXof: 210000,
      cnssBaseXof: 210000,
      cnssEmployeeXof: 11550,
      cnssEmployerXof: 33600,
      carfoBaseXof: 0,
      carfoEmployeeXof: 0,
      carfoEmployerXof: 0,
      iutsTaxableBaseXof: 198450,
      iutsXof: 37794,
      netPayXof: 160656,
      smigCompliance: true,
      smigGapXof: 0
    };
    payrollBfService.simulate.mockResolvedValue(result);

    const dto = {
      payrollDate: "2026-06-01",
      employeeRegime: "PRIVE",
      baseSalaryXof: 200000,
      taxableBonusXof: 10000,
      legalProfileId: "BF-DEFAULT"
    };

    const out = await controller.simulate(
      { tenantId: "tenant_1", userId: "actor_1" } as TenantContext,
      dto as never
    );

    expect(out).toEqual(result);
    expect(payrollBfService.simulate).toHaveBeenCalledWith("tenant_1", "actor_1", dto);
  });
});
