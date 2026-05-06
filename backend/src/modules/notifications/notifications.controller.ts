import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { Notification } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { RequirePermissions } from "../../common/rbac/permissions.decorator";
import { PermissionsGuard } from "../../common/rbac/permissions.guard";
import { CurrentTenant } from "../../common/tenancy/tenant-context.decorator";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { TenantContextGuard } from "../../common/tenancy/tenant-context.guard";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import { NotificationsService } from "./notifications.service";
import { ApiProblemResponsesForAuthedRoutes, ProblemDetailsSchema } from "../../common/http/problem-details.swagger";

@ApiTags("notifications")
@ApiExtraModels(ProblemDetailsSchema)
@ApiProblemResponsesForAuthedRoutes()
@Controller("notifications")
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @RequirePermissions("employee.write")
  create(
    @CurrentTenant() tenantContext: TenantContext,
    @Body() dto: CreateNotificationDto
  ): Promise<Notification> {
    return this.notificationsService.enqueue(
      tenantContext.tenantId,
      tenantContext.userId,
      dto
    );
  }

  @Post("dispatch")
  @RequirePermissions("tenant.manage")
  dispatch(): Promise<{ processed: number }> {
    return this.notificationsService.dispatchPending();
  }
}
