import { Injectable } from "@nestjs/common";
import { Employee } from "@prisma/client";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateEmployeeDto } from "./dto/create-employee.dto";

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async list(tenantId: string): Promise<Employee[]> {
    return this.prisma.employee.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" }
    });
  }

  async create(
    tenantId: string,
    actorUserId: string | undefined,
    dto: CreateEmployeeDto
  ): Promise<Employee> {
    const employee = await this.prisma.employee.create({
      data: {
        tenantId,
        workEmail: dto.workEmail,
        firstName: dto.firstName,
        lastName: dto.lastName,
        hireDate: new Date(dto.hireDate),
        departmentId: dto.departmentId,
        positionId: dto.positionId
      }
    });

    await this.auditService.record({
      tenantId,
      actorUserId,
      action: "employee.create",
      entityType: "employee",
      entityId: employee.id,
      afterJson: employee
    });
    return employee;
  }
}
