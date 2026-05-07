import { Injectable, NotFoundException } from "@nestjs/common";
import {
  EmployeeStatus,
  LeaveRequestStatus,
  Prisma
} from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  computeBfMonthlyAcquisition,
  countWorkingDaysInclusiveUtc,
  eligibleCalendarDaysInMonthBf,
  monthUtcBounds
} from "./leave-bf-acquisition.util";
import { LeaveBalanceSnapshotDto } from "./dto/leave-balance-response.dto";

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }
  return value.toNumber();
}

function resolveEmploymentLastInclusive(
  employee: { status: EmployeeStatus; hireDate: Date; updatedAt: Date },
  contracts: { endDate: Date | null }[]
): Date | undefined {
  if (employee.status === EmployeeStatus.ACTIVE) {
    return undefined;
  }
  const ends = contracts.map((c) => c.endDate).filter((d): d is Date => d !== null);
  if (ends.length > 0) {
    return ends.reduce((a, b) => (a.getTime() > b.getTime() ? a : b));
  }
  return employee.updatedAt;
}

@Injectable()
export class LeaveBalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async findEmployeeLinkedToUser(tenantId: string, userId: string) {
    return this.prisma.employee.findFirst({
      where: { tenantId, linkedUserId: userId }
    });
  }

  async syncPaidLeaveAcquisitionsThroughYearMonth(
    tenantId: string,
    employeeId: string,
    throughYear: number,
    throughMonth: number,
    actorUserId?: string
  ): Promise<void> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
      include: { contracts: true }
    });
    if (!employee) {
      throw new NotFoundException("Employé introuvable.");
    }

    const policy = await this.prisma.tenantLeavePolicy.upsert({
      where: { tenantId },
      update: {},
      create: { tenantId }
    });

    await this.prisma.employeePaidLeaveBalance.upsert({
      where: { employeeId },
      update: {},
      create: {
        tenantId,
        employeeId
      }
    });

    const employmentLast = resolveEmploymentLastInclusive(employee, employee.contracts);

    let y = employee.hireDate.getUTCFullYear();
    let m = employee.hireDate.getUTCMonth() + 1;

    const touchedMonths: string[] = [];
    const rate = decimalToNumber(policy.acquisitionRatePerFullMonth);

    while (y < throughYear || (y === throughYear && m <= throughMonth)) {
      const { monthStart, monthEnd, daysInMonth } = monthUtcBounds(y, m);

      const eligible = eligibleCalendarDaysInMonthBf({
        hireDate: employee.hireDate,
        employmentLastInclusive: employmentLast,
        monthStart,
        monthEnd,
        contractSpans: employee.contracts.map((c) => ({
          start: c.startDate,
          endInclusive: c.endDate ?? undefined
        }))
      });

      const { raw, rounded } = computeBfMonthlyAcquisition(eligible, daysInMonth, rate);

      await this.prisma.leavePaidAcquisition.upsert({
        where: {
          tenantId_employeeId_year_month: {
            tenantId,
            employeeId,
            year: y,
            month: m
          }
        },
        create: {
          tenantId,
          employeeId,
          year: y,
          month: m,
          daysInMonth,
          eligibleCalendarDays: eligible,
          rawAcquisition: raw,
          acquiredDays: rounded
        },
        update: {
          daysInMonth,
          eligibleCalendarDays: eligible,
          rawAcquisition: raw,
          acquiredDays: rounded
        }
      });
      touchedMonths.push(`${y}-${String(m).padStart(2, "0")}`);

      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }

    if (touchedMonths.length > 0) {
      await this.auditService.record({
        tenantId,
        actorUserId,
        action: "leave_balance.acquisitions_synced",
        entityType: "employee_leave_balance",
        entityId: employeeId,
        afterJson: {
          syncedThrough: `${throughYear}-${String(throughMonth).padStart(2, "0")}`,
          monthsCount: touchedMonths.length
        }
      });
    }
  }

  async sumConsumedPaidWorkingDays(
    tenantId: string,
    employeeId: string,
    excludeLeaveRequestId?: string
  ): Promise<number> {
    const rows = await this.prisma.leaveRequest.findMany({
      where: {
        tenantId,
        employeeId,
        status: LeaveRequestStatus.APPROVED,
        leaveType: { deductsPaidBalance: true },
        ...(excludeLeaveRequestId ? { id: { not: excludeLeaveRequestId } } : {})
      },
      select: { startDate: true, endDate: true }
    });
    let sum = 0;
    for (const row of rows) {
      sum += countWorkingDaysInclusiveUtc(row.startDate, row.endDate);
    }
    return sum;
  }

  async getBalanceSnapshotForEmployee(
    tenantId: string,
    employeeId: string,
    actorUserId: string | undefined
  ): Promise<LeaveBalanceSnapshotDto> {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId }
    });
    if (!employee) {
      throw new NotFoundException("Employé introuvable.");
    }

    const now = new Date();
    const throughYear = now.getUTCFullYear();
    const throughMonth = now.getUTCMonth() + 1;

    await this.syncPaidLeaveAcquisitionsThroughYearMonth(
      tenantId,
      employeeId,
      throughYear,
      throughMonth,
      actorUserId
    );

    const policy = await this.prisma.tenantLeavePolicy.findUniqueOrThrow({
      where: { tenantId }
    });

    const acquisitionSum = await this.prisma.leavePaidAcquisition.aggregate({
      where: { tenantId, employeeId },
      _sum: { acquiredDays: true }
    });

    const balanceRow = await this.prisma.employeePaidLeaveBalance.findUniqueOrThrow({
      where: { employeeId }
    });

    const consumed = await this.sumConsumedPaidWorkingDays(tenantId, employeeId);

    const accrued = decimalToNumber(acquisitionSum._sum.acquiredDays);
    const carriedOver = decimalToNumber(balanceRow.carriedOverDays);
    const expiredCarry = decimalToNumber(balanceRow.expiredCarryDays);

    return {
      employeeId,
      tenantId,
      accruedPaidDays: accrued,
      carriedOverDays: carriedOver,
      expiredCarryDays: expiredCarry,
      consumedPaidDays: consumed,
      availablePaidDays: carriedOver + accrued - consumed,
      acquisitionRatePerFullMonth: decimalToNumber(policy.acquisitionRatePerFullMonth),
      carryOverEnabled: policy.carryOverEnabled,
      carryOverCapDays: decimalToNumber(policy.carryOverCapDays),
      syncedThroughYearMonth: `${throughYear}-${String(throughMonth).padStart(2, "0")}`
    };
  }
}
