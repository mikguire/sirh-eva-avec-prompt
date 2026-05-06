import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { CurrentTenant } from "../../common/tenancy/tenant-context.decorator";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { TenantContextGuard } from "../../common/tenancy/tenant-context.guard";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { PermissionsGuard } from "../../common/rbac/permissions.guard";
import { RequirePermissions } from "../../common/rbac/permissions.decorator";
import { Employee } from "@prisma/client";
import { CreateEmployeeDto } from "./dto/create-employee.dto";
import { EmployeesService } from "./employees.service";
import {
  ApiProblemResponsesForAuthedRoutes,
  ProblemDetailsSchema
} from "../../common/http/problem-details.swagger";

@ApiTags("employees")
@ApiExtraModels(ProblemDetailsSchema)
@ApiProblemResponsesForAuthedRoutes()
@Controller("employees")
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequirePermissions("employee.read")
  list(@CurrentTenant() tenantContext: TenantContext): Promise<Employee[]> {
    return this.employeesService.list(tenantContext.tenantId);
  }

  @Post()
  @RequirePermissions("employee.write")
  create(
    @CurrentTenant() tenantContext: TenantContext,
    @Body() dto: CreateEmployeeDto
  ): Promise<Employee> {
    return this.employeesService.create(tenantContext.tenantId, tenantContext.userId, dto);
  }
}
