import { Body, Controller, Get, Post, Request, UseGuards } from "@nestjs/common";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { Tenant } from "@prisma/client";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { RequirePermissions } from "../../common/rbac/permissions.decorator";
import { PermissionsGuard } from "../../common/rbac/permissions.guard";
import { PrismaService } from "../../prisma/prisma.service";
import { ImpersonateDto } from "./dto/impersonate.dto";
import { AdminService } from "./admin.service";
import { ApiProblemResponsesForAuthedRoutes, ProblemDetailsSchema } from "../../common/http/problem-details.swagger";

@ApiTags("admin")
@ApiExtraModels(ProblemDetailsSchema)
@ApiProblemResponsesForAuthedRoutes()
@Controller("admin")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminService: AdminService
  ) {}

  @Get("tenants")
  @RequirePermissions("tenant.manage")
  listTenants(): Promise<Tenant[]> {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  @Post("impersonate")
  @RequirePermissions("tenant.manage")
  impersonate(
    @Request() request: { user: { sub: string } },
    @Body() dto: ImpersonateDto
  ): Promise<{ accessToken: string; expiresIn: number }> {
    return this.adminService.createImpersonationToken(
      request.user.sub,
      dto.tenantId,
      dto.userId
    );
  }
}
