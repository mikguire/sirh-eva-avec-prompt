import { Injectable, NotFoundException } from "@nestjs/common";
import { LeaveRequest, LeaveRequestStatus } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async create(
    tenantId: string,
    actorUserId: string | undefined,
    dto: CreateLeaveRequestDto
  ): Promise<LeaveRequest> {
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
      where: { id, tenantId }
    });
    if (!existing) {
      throw new NotFoundException("Leave request not found");
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
