import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { LeaveRequest } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { RequirePermissions } from "../../common/rbac/permissions.decorator";
import { PermissionsGuard } from "../../common/rbac/permissions.guard";
import { CurrentTenant } from "../../common/tenancy/tenant-context.decorator";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { TenantContextGuard } from "../../common/tenancy/tenant-context.guard";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { LeaveService } from "./leave.service";
import { ApiProblemResponsesForAuthedRoutes, ProblemDetailsSchema } from "../../common/http/problem-details.swagger";

@ApiTags("leave-requests")
@ApiExtraModels(ProblemDetailsSchema)
@ApiProblemResponsesForAuthedRoutes()
@Controller("leave-requests")
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @RequirePermissions("leave.write")
  create(
    @CurrentTenant() tenantContext: TenantContext,
    @Body() dto: CreateLeaveRequestDto
  ): Promise<LeaveRequest> {
    return this.leaveService.create(tenantContext.tenantId, tenantContext.userId, dto);
  }

  @Post(":id/approve")
  @RequirePermissions("leave.approve")
  approve(
    @CurrentTenant() tenantContext: TenantContext,
    @Param("id") id: string
  ): Promise<LeaveRequest> {
    return this.leaveService.approve(tenantContext.tenantId, tenantContext.userId ?? "", id);
  }
}
