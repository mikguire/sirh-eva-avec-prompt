import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { AuditLog } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { RequirePermissions } from "../../common/rbac/permissions.decorator";
import { PermissionsGuard } from "../../common/rbac/permissions.guard";
import { CurrentTenant } from "../../common/tenancy/tenant-context.decorator";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { TenantContextGuard } from "../../common/tenancy/tenant-context.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiProblemResponsesForAuthedRoutes, ProblemDetailsSchema } from "../../common/http/problem-details.swagger";

@ApiTags("audit-logs")
@ApiExtraModels(ProblemDetailsSchema)
@ApiProblemResponsesForAuthedRoutes()
@Controller("audit-logs")
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions("audit.read")
  list(
    @CurrentTenant() tenantContext: TenantContext,
    @Query("limit") limit?: string
  ): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { tenantId: tenantContext.tenantId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Number(limit ?? "50"), 200)
    });
  }
}
