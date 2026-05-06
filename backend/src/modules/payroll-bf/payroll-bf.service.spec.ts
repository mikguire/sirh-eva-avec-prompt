import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PayrollBfEmployeeRegime } from "./dto/simulate-payroll-bf.dto";
import { PayrollBfCalculator } from "./payroll-bf-calculator";
import { PayrollBfService } from "./payroll-bf.service";

describe("PayrollBfService", () => {
  it("simulates and records persistence + audit", async () => {
    const payrollBfLegalVersion = {
      id: "ver-db-1",
      legalVersionId: "BF-2026-01",
      cnssEmployeeRate: new Prisma.Decimal("0.055"),
      cnssEmployerRate: new Prisma.Decimal("0.16"),
      cnssCeilingXof: 1_000_000,
      carfoEmployeeRate: new Prisma.Decimal("0.08"),
      carfoEmployerRate: new Prisma.Decimal("0.12"),
      carfoEnabledRegimes: ["PUBLIC_CARFO"],
      smigXof: 45_000,
      smigControlEnabled: true,
      roundingMode: "ROUND_HALF_UP",
      iutsBrackets: [
        { lowerBoundXof: 0, upperBoundXof: 30_000, rate: new Prisma.Decimal("0.00") },
        { lowerBoundXof: 30_000, upperBoundXof: 50_000, rate: new Prisma.Decimal("0.12") },
        { lowerBoundXof: 50_000, upperBoundXof: 80_000, rate: new Prisma.Decimal("0.20") },
        { lowerBoundXof: 80_000, upperBoundXof: null, rate: new Prisma.Decimal("0.25") }
      ]
    };
    const prismaMock = {
      payrollBfLegalVersion: { findMany: jest.fn().mockResolvedValue([payrollBfLegalVersion]) },
      payrollBfSimulation: { create: jest.fn().mockResolvedValue({ id: "sim-1" }) }
    };
    const prisma = prismaMock as unknown as PrismaService;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;

    const service = new PayrollBfService(prisma, audit, new PayrollBfCalculator());

    const out = await service.simulate("t1", "u1", {
      payrollDate: "2026-02-01",
      employeeRegime: PayrollBfEmployeeRegime.PRIVE,
      baseSalaryXof: 100_000,
      legalProfileId: "BF-DEFAULT"
    });

    expect(out.cnssEmployeeXof).toBe(5_500);
    expect(prismaMock.payrollBfSimulation.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "payroll-bf.simulate",
        tenantId: "t1",
        actorUserId: "u1"
      })
    );
  });

  it("fails when legal version resolution is ambiguous or missing", async () => {
    const prisma = {
      payrollBfLegalVersion: { findMany: jest.fn().mockResolvedValue([]) }
    } as unknown as PrismaService;
    const audit = { record: jest.fn() } as unknown as AuditService;
    const service = new PayrollBfService(prisma, audit, new PayrollBfCalculator());

    await expect(
      service.simulate("t1", "u1", {
        payrollDate: "2026-02-01",
        employeeRegime: PayrollBfEmployeeRegime.PRIVE,
        baseSalaryXof: 100_000,
        legalProfileId: "BF-DEFAULT"
      })
    ).rejects.toThrow(BadRequestException);
  });
});
