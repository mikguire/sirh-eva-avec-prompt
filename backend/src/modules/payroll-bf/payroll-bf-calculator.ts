import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PayrollBfEmployeeRegime } from "./dto/simulate-payroll-bf.dto";
import { PayrollBfSimulationResponseDto } from "./dto/payroll-bf-simulation-response.dto";

type IutsBracket = {
  lowerBoundXof: number;
  upperBoundXof: number | null;
  rate: Prisma.Decimal;
};

type LegalVersionParams = {
  legalVersionId: string;
  cnssEmployeeRate: Prisma.Decimal;
  cnssEmployerRate: Prisma.Decimal;
  cnssCeilingXof: number;
  carfoEmployeeRate: Prisma.Decimal;
  carfoEmployerRate: Prisma.Decimal;
  carfoEnabledRegimes: string[];
  smigXof: number;
  smigControlEnabled: boolean;
  roundingMode: string;
  iutsBrackets: IutsBracket[];
};

type CalculateInput = {
  employeeRegime: PayrollBfEmployeeRegime;
  baseSalaryXof: number;
  taxableBonusXof: number;
  taxableOvertimeXof: number;
  nontaxableAllowanceXof: number;
  housingAllowanceXof: number;
  functionAllowanceXof: number;
  transportAllowanceXof: number;
  numberOfChildren: number;
  maritalStatus?: string;
  isCadre: boolean;
};

@Injectable()
export class PayrollBfCalculator {
  calculate(input: CalculateInput, params: LegalVersionParams): PayrollBfSimulationResponseDto {
    if (params.roundingMode !== "ROUND_HALF_UP") {
      throw new BadRequestException(`Unsupported rounding mode: ${params.roundingMode}`);
    }

    const grossTaxableXof =
      input.baseSalaryXof +
      input.taxableBonusXof +
      input.taxableOvertimeXof +
      input.housingAllowanceXof +
      input.functionAllowanceXof +
      input.transportAllowanceXof;

    if (params.smigControlEnabled && input.baseSalaryXof < params.smigXof) {
      throw new BadRequestException("SMIG threshold is not met for this simulation.");
    }

    const cnssBaseXof = Math.min(grossTaxableXof, params.cnssCeilingXof);
    const carfoEnabled = params.carfoEnabledRegimes.includes(input.employeeRegime);
    const carfoBaseXof = carfoEnabled ? grossTaxableXof : 0;

    const cnssEmployeeXof = this.roundHalfUp(
      new Prisma.Decimal(cnssBaseXof).mul(params.cnssEmployeeRate)
    );
    const cnssEmployerXof = this.roundHalfUp(
      new Prisma.Decimal(cnssBaseXof).mul(params.cnssEmployerRate)
    );
    const carfoEmployeeXof = this.roundHalfUp(
      new Prisma.Decimal(carfoBaseXof).mul(params.carfoEmployeeRate)
    );
    const carfoEmployerXof = this.roundHalfUp(
      new Prisma.Decimal(carfoBaseXof).mul(params.carfoEmployerRate)
    );

    const housingExonerationXof = Math.min(
      this.roundHalfUp(new Prisma.Decimal(grossTaxableXof).mul(0.2)),
      75_000,
      input.housingAllowanceXof
    );
    const functionExonerationXof = Math.min(
      this.roundHalfUp(new Prisma.Decimal(grossTaxableXof).mul(0.05)),
      50_000,
      input.functionAllowanceXof
    );
    const transportExonerationXof = Math.min(
      new Prisma.Decimal(grossTaxableXof).sub(cnssEmployeeXof).mul(0.05).toNumber(),
      30_000,
      input.transportAllowanceXof
    );
    const totalExonerationXof =
      housingExonerationXof + functionExonerationXof + transportExonerationXof;

    const abatementBaseXof = input.baseSalaryXof + input.taxableBonusXof + input.taxableOvertimeXof;
    const professionalAbatementRate = input.isCadre ? 0.2 : 0.25;
    const professionalAbatementXof = this.roundHalfUp(
      new Prisma.Decimal(abatementBaseXof).mul(professionalAbatementRate)
    );
    const childrenAbatementXof = Math.min(3, input.numberOfChildren) * 5_000;

    const rniBeforeRounding = Math.max(
      0,
      grossTaxableXof -
        totalExonerationXof -
        cnssEmployeeXof -
        professionalAbatementXof -
        childrenAbatementXof
    );
    const iutsTaxableBaseXof = Math.floor(rniBeforeRounding / 100) * 100;

    const iutsGrossXof = this.roundHalfUp(
      this.computeProgressiveTax(iutsTaxableBaseXof, params.iutsBrackets)
    );
    const familyChargeCount = this.computeFamilyChargeCount(input.maritalStatus, input.numberOfChildren);
    const familyReductionRate = this.getFamilyReductionRate(familyChargeCount);
    const iutsXof = Math.max(
      0,
      this.roundHalfUp(new Prisma.Decimal(iutsGrossXof).mul(new Prisma.Decimal(1).sub(familyReductionRate)))
    );

    const netPayXof =
      grossTaxableXof - cnssEmployeeXof - carfoEmployeeXof - iutsXof + input.nontaxableAllowanceXof;
    const smigGapXof = Math.max(0, params.smigXof - input.baseSalaryXof);

    return {
      currency: "XOF",
      legalVersionId: params.legalVersionId,
      grossTaxableXof,
      cnssBaseXof,
      cnssEmployeeXof,
      cnssEmployerXof,
      iutsTaxableBaseXof,
      iutsXof,
      carfoBaseXof,
      carfoEmployeeXof,
      carfoEmployerXof,
      netPayXof,
      smigCompliance: smigGapXof === 0,
      smigGapXof
    };
  }

  private computeProgressiveTax(baseXof: number, brackets: IutsBracket[]): Prisma.Decimal {
    let total = new Prisma.Decimal(0);

    for (const bracket of brackets) {
      if (baseXof <= bracket.lowerBoundXof) {
        continue;
      }
      const taxableInBracket =
        bracket.upperBoundXof === null
          ? baseXof - bracket.lowerBoundXof
          : Math.min(baseXof, bracket.upperBoundXof) - bracket.lowerBoundXof;
      if (taxableInBracket <= 0) {
        continue;
      }
      total = total.add(new Prisma.Decimal(taxableInBracket).mul(bracket.rate));
    }

    return total;
  }

  private roundHalfUp(value: Prisma.Decimal): number {
    return value.toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP).toNumber();
  }

  private computeFamilyChargeCount(maritalStatus: string | undefined, numberOfChildren: number): number {
    const normalizedStatus = this.normalizeText(maritalStatus);
    const statusesWithDependentSpouse = new Set(["marie", "mariee", "pacse", "concubinage"]);
    const dependentSpouseCount = statusesWithDependentSpouse.has(normalizedStatus) ? 1 : 0;
    return Math.min(4, dependentSpouseCount + numberOfChildren);
  }

  private getFamilyReductionRate(familyChargeCount: number): Prisma.Decimal {
    if (familyChargeCount <= 0) {
      return new Prisma.Decimal(0);
    }
    if (familyChargeCount === 1) {
      return new Prisma.Decimal(0.08);
    }
    if (familyChargeCount === 2) {
      return new Prisma.Decimal(0.1);
    }
    if (familyChargeCount === 3) {
      return new Prisma.Decimal(0.12);
    }
    return new Prisma.Decimal(0.14);
  }

  private normalizeText(value: string | undefined): string {
    if (!value) {
      return "";
    }
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[()]/g, "")
      .trim()
      .toLowerCase();
  }
}
