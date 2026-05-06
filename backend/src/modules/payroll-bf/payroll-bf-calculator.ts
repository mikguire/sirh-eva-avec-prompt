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
};

@Injectable()
export class PayrollBfCalculator {
  calculate(input: CalculateInput, params: LegalVersionParams): PayrollBfSimulationResponseDto {
    if (params.roundingMode !== "ROUND_HALF_UP") {
      throw new BadRequestException(`Unsupported rounding mode: ${params.roundingMode}`);
    }

    const grossTaxableXof =
      input.baseSalaryXof + input.taxableBonusXof + input.taxableOvertimeXof;

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

    const iutsTaxableBaseXof = Math.max(0, grossTaxableXof - cnssEmployeeXof - carfoEmployeeXof);
    const iutsXof = this.roundHalfUp(this.computeProgressiveTax(iutsTaxableBaseXof, params.iutsBrackets));

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
}
