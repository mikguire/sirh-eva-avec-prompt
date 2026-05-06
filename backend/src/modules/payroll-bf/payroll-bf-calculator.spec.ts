import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PayrollBfEmployeeRegime } from "./dto/simulate-payroll-bf.dto";
import { PayrollBfCalculator } from "./payroll-bf-calculator";

const buildParams = (overrides?: Partial<{
  legalVersionId: string;
  cnssEmployeeRate: string;
  cnssEmployerRate: string;
  cnssCeilingXof: number;
  carfoEmployeeRate: string;
  carfoEmployerRate: string;
  carfoEnabledRegimes: string[];
  smigXof: number;
  smigControlEnabled: boolean;
  roundingMode: string;
  iutsBrackets: Array<{ lowerBoundXof: number; upperBoundXof: number | null; rate: string }>;
}>) => ({
  legalVersionId: overrides?.legalVersionId ?? "BF-2026-01",
  cnssEmployeeRate: new Prisma.Decimal(overrides?.cnssEmployeeRate ?? "0.055"),
  cnssEmployerRate: new Prisma.Decimal(overrides?.cnssEmployerRate ?? "0.16"),
  cnssCeilingXof: overrides?.cnssCeilingXof ?? 800_000,
  carfoEmployeeRate: new Prisma.Decimal(overrides?.carfoEmployeeRate ?? "0.08"),
  carfoEmployerRate: new Prisma.Decimal(overrides?.carfoEmployerRate ?? "0.12"),
  carfoEnabledRegimes: overrides?.carfoEnabledRegimes ?? ["PUBLIC_CARFO"],
  smigXof: overrides?.smigXof ?? 45_000,
  smigControlEnabled: overrides?.smigControlEnabled ?? true,
  roundingMode: overrides?.roundingMode ?? "ROUND_HALF_UP",
  iutsBrackets: (overrides?.iutsBrackets ?? [
    { lowerBoundXof: 0, upperBoundXof: 30_000, rate: "0.00" },
    { lowerBoundXof: 30_000, upperBoundXof: 50_000, rate: "0.121" },
    { lowerBoundXof: 50_000, upperBoundXof: 80_000, rate: "0.139" },
    { lowerBoundXof: 80_000, upperBoundXof: 120_000, rate: "0.157" },
    { lowerBoundXof: 120_000, upperBoundXof: 170_000, rate: "0.184" },
    { lowerBoundXof: 170_000, upperBoundXof: 250_000, rate: "0.217" },
    { lowerBoundXof: 250_000, upperBoundXof: null, rate: "0.25" }
  ]).map((item) => ({
    lowerBoundXof: item.lowerBoundXof,
    upperBoundXof: item.upperBoundXof,
    rate: new Prisma.Decimal(item.rate)
  }))
});

describe("PayrollBfCalculator", () => {
  const calculator = new PayrollBfCalculator();

  it("calculates private nominal simulation with 2026 rates", () => {
    const output = calculator.calculate(
      {
        employeeRegime: PayrollBfEmployeeRegime.PRIVE,
        baseSalaryXof: 100_000,
        taxableBonusXof: 0,
        taxableOvertimeXof: 0,
        nontaxableAllowanceXof: 0,
        housingAllowanceXof: 0,
        functionAllowanceXof: 0,
        transportAllowanceXof: 0,
        numberOfChildren: 0,
        maritalStatus: "celibataire",
        isCadre: false
      },
      buildParams()
    );

    expect(output.cnssEmployeeXof).toBe(5_500);
    expect(output.cnssEmployerXof).toBe(16_000);
    expect(output.iutsXof).toBe(5_131);
    expect(output.netPayXof).toBe(89_369);
  });

  it("applies CNSS ceiling", () => {
    const output = calculator.calculate(
      {
        employeeRegime: PayrollBfEmployeeRegime.PRIVE,
        baseSalaryXof: 1_200_000,
        taxableBonusXof: 0,
        taxableOvertimeXof: 0,
        nontaxableAllowanceXof: 0,
        housingAllowanceXof: 0,
        functionAllowanceXof: 0,
        transportAllowanceXof: 0,
        numberOfChildren: 0,
        maritalStatus: "celibataire",
        isCadre: false
      },
      buildParams()
    );

    expect(output.cnssBaseXof).toBe(800_000);
    expect(output.cnssEmployeeXof).toBe(44_000);
    expect(output.cnssEmployerXof).toBe(128_000);
  });

  it("activates CARFO only for PUBLIC_CARFO", () => {
    const output = calculator.calculate(
      {
        employeeRegime: PayrollBfEmployeeRegime.PUBLIC_CARFO,
        baseSalaryXof: 150_000,
        taxableBonusXof: 0,
        taxableOvertimeXof: 0,
        nontaxableAllowanceXof: 0,
        housingAllowanceXof: 0,
        functionAllowanceXof: 0,
        transportAllowanceXof: 0,
        numberOfChildren: 0,
        maritalStatus: "celibataire",
        isCadre: false
      },
      buildParams()
    );

    expect(output.carfoEmployeeXof).toBe(12_000);
    expect(output.carfoEmployerXof).toBe(18_000);
    expect(output.netPayXof).toBe(119_361);
  });

  it("adds non taxable allowance to net pay", () => {
    const output = calculator.calculate(
      {
        employeeRegime: PayrollBfEmployeeRegime.PRIVE,
        baseSalaryXof: 120_000,
        taxableBonusXof: 0,
        taxableOvertimeXof: 0,
        nontaxableAllowanceXof: 10_000,
        housingAllowanceXof: 0,
        functionAllowanceXof: 0,
        transportAllowanceXof: 0,
        numberOfChildren: 0,
        maritalStatus: "celibataire",
        isCadre: false
      },
      buildParams()
    );

    expect(output.netPayXof).toBe(116_276);
  });

  it("rounds half up deterministically", () => {
    const output = calculator.calculate(
      {
        employeeRegime: PayrollBfEmployeeRegime.PRIVE,
        baseSalaryXof: 10,
        taxableBonusXof: 0,
        taxableOvertimeXof: 0,
        nontaxableAllowanceXof: 0,
        housingAllowanceXof: 0,
        functionAllowanceXof: 0,
        transportAllowanceXof: 0,
        numberOfChildren: 0,
        maritalStatus: "celibataire",
        isCadre: false
      },
      buildParams({
        smigControlEnabled: false,
        cnssEmployeeRate: "0.05",
        cnssEmployerRate: "0.15",
        iutsBrackets: [{ lowerBoundXof: 0, upperBoundXof: null, rate: "0.05" }]
      })
    );

    expect(output.cnssEmployeeXof).toBe(1);
    expect(output.iutsXof).toBe(0);
  });

  it("supports another legal version rates through parameters", () => {
    const output = calculator.calculate(
      {
        employeeRegime: PayrollBfEmployeeRegime.PRIVE,
        baseSalaryXof: 100_000,
        taxableBonusXof: 0,
        taxableOvertimeXof: 0,
        nontaxableAllowanceXof: 0,
        housingAllowanceXof: 0,
        functionAllowanceXof: 0,
        transportAllowanceXof: 0,
        numberOfChildren: 0,
        maritalStatus: "celibataire",
        isCadre: false
      },
      buildParams({
        legalVersionId: "BF-2025-01",
        cnssEmployeeRate: "0.05",
        cnssEmployerRate: "0.15",
        iutsBrackets: [
          { lowerBoundXof: 0, upperBoundXof: 30_000, rate: "0.00" },
          { lowerBoundXof: 30_000, upperBoundXof: 60_000, rate: "0.10" },
          { lowerBoundXof: 60_000, upperBoundXof: null, rate: "0.20" }
        ]
      })
    );

    expect(output.legalVersionId).toBe("BF-2025-01");
    expect(output.cnssEmployeeXof).toBe(5_000);
    expect(output.cnssEmployerXof).toBe(15_000);
    expect(output.iutsXof).toBe(5_000);
    expect(output.netPayXof).toBe(90_000);
  });

  it("rejects below SMIG when control is enabled", () => {
    expect(() =>
      calculator.calculate(
        {
          employeeRegime: PayrollBfEmployeeRegime.PRIVE,
          baseSalaryXof: 40_000,
          taxableBonusXof: 0,
          taxableOvertimeXof: 0,
          nontaxableAllowanceXof: 0,
          housingAllowanceXof: 0,
          functionAllowanceXof: 0,
          transportAllowanceXof: 0,
          numberOfChildren: 0,
          maritalStatus: "celibataire",
          isCadre: false
        },
        buildParams()
      )
    ).toThrow(BadRequestException);
  });

  it("allows below SMIG when control is disabled", () => {
    const output = calculator.calculate(
      {
        employeeRegime: PayrollBfEmployeeRegime.PRIVE,
        baseSalaryXof: 40_000,
        taxableBonusXof: 0,
        taxableOvertimeXof: 0,
        nontaxableAllowanceXof: 0,
        housingAllowanceXof: 0,
        functionAllowanceXof: 0,
        transportAllowanceXof: 0,
        numberOfChildren: 0,
        maritalStatus: "celibataire",
        isCadre: false
      },
      buildParams({ smigControlEnabled: false })
    );

    expect(output.smigCompliance).toBe(false);
    expect(output.smigGapXof).toBe(5_000);
  });

  it("applies normative exemptions, child abatements and family reductions", () => {
    const output = calculator.calculate(
      {
        employeeRegime: PayrollBfEmployeeRegime.PRIVE,
        baseSalaryXof: 200_000,
        taxableBonusXof: 10_000,
        taxableOvertimeXof: 0,
        nontaxableAllowanceXof: 0,
        housingAllowanceXof: 50_000,
        functionAllowanceXof: 0,
        transportAllowanceXof: 20_000,
        numberOfChildren: 2,
        maritalStatus: "celibataire",
        isCadre: false
      },
      buildParams()
    );

    expect(output.grossTaxableXof).toBe(280_000);
    expect(output.cnssEmployeeXof).toBe(15_400);
    expect(output.iutsTaxableBaseXof).toBe(138_800);
    expect(output.iutsXof).toBe(14_696);
    expect(output.netPayXof).toBe(249_904);
  });
});
