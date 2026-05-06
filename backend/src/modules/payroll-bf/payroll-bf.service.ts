import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PayrollBfSimulationResponseDto } from "./dto/payroll-bf-simulation-response.dto";
import { SimulatePayrollBfDto } from "./dto/simulate-payroll-bf.dto";
import { PayrollBfCalculator } from "./payroll-bf-calculator";

@Injectable()
export class PayrollBfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly payrollBfCalculator: PayrollBfCalculator
  ) {}

  async simulate(
    tenantId: string,
    actorUserId: string | undefined,
    dto: SimulatePayrollBfDto
  ): Promise<PayrollBfSimulationResponseDto> {
    const payrollDate = new Date(dto.payrollDate);
    const versions = await this.prisma.payrollBfLegalVersion.findMany({
      where: {
        tenantId,
        legalProfile: { code: dto.legalProfileId },
        effectiveStart: { lte: payrollDate },
        OR: [{ effectiveEnd: null }, { effectiveEnd: { gt: payrollDate } }]
      },
      include: {
        iutsBrackets: { orderBy: { ordinal: "asc" } }
      }
    });

    if (versions.length !== 1) {
      throw new BadRequestException("LEGAL_VERSION_RESOLUTION_ERROR");
    }

    const legalVersion = versions[0];
    if (legalVersion.iutsBrackets.length === 0) {
      throw new BadRequestException("IUTS brackets are missing for legal version.");
    }

    const result = this.payrollBfCalculator.calculate(
      {
        employeeRegime: dto.employeeRegime,
        baseSalaryXof: dto.baseSalaryXof,
        taxableBonusXof: dto.taxableBonusXof ?? 0,
        taxableOvertimeXof: dto.taxableOvertimeXof ?? 0,
        nontaxableAllowanceXof: dto.nontaxableAllowanceXof ?? 0
      },
      {
        legalVersionId: legalVersion.legalVersionId,
        cnssEmployeeRate: legalVersion.cnssEmployeeRate,
        cnssEmployerRate: legalVersion.cnssEmployerRate,
        cnssCeilingXof: legalVersion.cnssCeilingXof,
        carfoEmployeeRate: legalVersion.carfoEmployeeRate,
        carfoEmployerRate: legalVersion.carfoEmployerRate,
        carfoEnabledRegimes: legalVersion.carfoEnabledRegimes,
        smigXof: legalVersion.smigXof,
        smigControlEnabled: legalVersion.smigControlEnabled,
        roundingMode: legalVersion.roundingMode,
        iutsBrackets: legalVersion.iutsBrackets.map((item) => ({
          lowerBoundXof: item.lowerBoundXof,
          upperBoundXof: item.upperBoundXof,
          rate: item.rate
        }))
      }
    );

    await this.prisma.payrollBfSimulation.create({
      data: {
        tenantId,
        actorUserId,
        payrollDate,
        employeeRegime: dto.employeeRegime,
        legalProfileId: dto.legalProfileId,
        legalVersionId: legalVersion.id,
        baseSalaryXof: dto.baseSalaryXof,
        taxableBonusXof: dto.taxableBonusXof ?? 0,
        taxableOvertimeXof: dto.taxableOvertimeXof ?? 0,
        nontaxableAllowanceXof: dto.nontaxableAllowanceXof ?? 0,
        grossXof: result.grossTaxableXof,
        cnssEmployeeXof: result.cnssEmployeeXof,
        cnssEmployerXof: result.cnssEmployerXof,
        iutsXof: result.iutsXof,
        carfoEmployeeXof: result.carfoEmployeeXof,
        carfoEmployerXof: result.carfoEmployerXof,
        netXof: result.netPayXof,
        currency: result.currency
      }
    });

    await this.auditService.record({
      tenantId,
      actorUserId,
      action: "payroll-bf.simulate",
      entityType: "payroll-bf-simulation",
      entityId: legalVersion.id,
      afterJson: {
        legalProfileId: dto.legalProfileId,
        payrollDate: dto.payrollDate,
        result
      }
    });

    return result;
  }
}
