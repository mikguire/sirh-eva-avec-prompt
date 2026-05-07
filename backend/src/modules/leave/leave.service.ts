import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { LeaveRequest, LeaveRequestStatus } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { countWorkingDaysInclusiveUtc } from "./leave-bf-acquisition.util";
import { LeaveBalanceService } from "./leave-balance.service";

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly leaveBalanceService: LeaveBalanceService
  ) {}

  async create(
    tenantId: string,
    actorUserId: string | undefined,
    dto: CreateLeaveRequestDto
  ): Promise<LeaveRequest> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start > end) {
      throw new BadRequestException({
        message: "La date de début doit précéder ou égaler la date de fin.",
        "ev:code": "EV_LEAVE_INVALID_DATE_RANGE"
      });
    }

    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        leaveTypeId: dto.leaveTypeId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason
      }
    });
    await this.auditService.record({
      tenantId,
      actorUserId,
      action: "leave_request.create",
      entityType: "leave_request",
      entityId: leaveRequest.id,
      afterJson: leaveRequest
    });
    return leaveRequest;
  }

  async approve(tenantId: string, approverUserId: string, id: string): Promise<LeaveRequest> {
    const existing = await this.prisma.leaveRequest.findFirst({
      where: { id, tenantId },
      include: { leaveType: true }
    });
    if (!existing) {
      throw new NotFoundException("Leave request not found");
    }

    const overlap = await this.prisma.leaveRequest.findFirst({
      where: {
        tenantId,
        employeeId: existing.employeeId,
        status: LeaveRequestStatus.APPROVED,
        id: { not: existing.id },
        startDate: { lte: existing.endDate },
        endDate: { gte: existing.startDate }
      }
    });
    if (overlap) {
      throw new ConflictException({
        message: "Chevauchement avec une absence déjà approuvée.",
        "ev:code": "EV_LEAVE_OVERLAP"
      });
    }

    if (existing.leaveType.deductsPaidBalance) {
      const workingDays = countWorkingDaysInclusiveUtc(existing.startDate, existing.endDate);
      const snapshot = await this.leaveBalanceService.getBalanceSnapshotForEmployee(
        tenantId,
        existing.employeeId,
        approverUserId
      );
      if (workingDays > snapshot.availablePaidDays) {
        throw new ConflictException({
          message: "Solde de congés payés insuffisant.",
          "ev:code": "EV_LEAVE_INSUFFICIENT_BALANCE"
        });
      }
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id: existing.id },
      data: { status: LeaveRequestStatus.APPROVED, approverId: approverUserId }
    });
    await this.auditService.record({
      tenantId,
      actorUserId: approverUserId,
      action: "leave_request.approve",
      entityType: "leave_request",
      entityId: updated.id,
      beforeJson: existing,
      afterJson: updated
    });
    return updated;
  }
}
