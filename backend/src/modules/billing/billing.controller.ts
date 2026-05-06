import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { Subscription } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { RequirePermissions } from "../../common/rbac/permissions.decorator";
import { PermissionsGuard } from "../../common/rbac/permissions.guard";
import { CurrentTenant } from "../../common/tenancy/tenant-context.decorator";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { TenantContextGuard } from "../../common/tenancy/tenant-context.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { ApiProblemResponsesForAuthedRoutes, ProblemDetailsSchema } from "../../common/http/problem-details.swagger";

@ApiTags("billing")
@ApiExtraModels(ProblemDetailsSchema)
@ApiProblemResponsesForAuthedRoutes()
@Controller("billing")
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("subscription")
  @RequirePermissions("billing.manage")
  getCurrentSubscription(@CurrentTenant() tenantContext: TenantContext): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: { tenantId: tenantContext.tenantId },
      orderBy: { createdAt: "desc" }
    });
  }
}
