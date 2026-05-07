import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UnauthorizedException,
  UseGuards
} from "@nestjs/common";
import { ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { ApiProblemResponsesForAuthedRoutes, ProblemDetailsSchema } from "../../common/http/problem-details.swagger";
import { RequirePermissions } from "../../common/rbac/permissions.decorator";
import { PermissionsGuard } from "../../common/rbac/permissions.guard";
import { CurrentTenant } from "../../common/tenancy/tenant-context.decorator";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { TenantContextGuard } from "../../common/tenancy/tenant-context.guard";
import { LeaveBalanceSnapshotDto } from "./dto/leave-balance-response.dto";
import { LeaveBalanceService } from "./leave-balance.service";

@ApiTags("leave-balances")
@ApiExtraModels(ProblemDetailsSchema)
@ApiProblemResponsesForAuthedRoutes()
@Controller("leave-balances")
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class LeaveBalanceController {
  constructor(private readonly leaveBalanceService: LeaveBalanceService) {}

  @Get("me")
  @RequirePermissions("leave.balance.read")
  @ApiOperation({ summary: "Soldes congés payés BF pour l’employé lié au compte utilisateur courant." })
  async getMyBalance(@CurrentTenant() tenantContext: TenantContext): Promise<LeaveBalanceSnapshotDto> {
    const userId = tenantContext.userId;
    if (!userId) {
      throw new UnauthorizedException("Utilisateur non authentifié.");
    }
    const employee = await this.leaveBalanceService.findEmployeeLinkedToUser(
      tenantContext.tenantId,
      userId
    );
    if (!employee) {
      throw new NotFoundException({
        message: "Aucun profil employé lié à cet utilisateur pour ce tenant.",
        "ev:code": "EV_LEAVE_EMPLOYEE_LINK_MISSING"
      });
    }
    return this.leaveBalanceService.getBalanceSnapshotForEmployee(
      tenantContext.tenantId,
      employee.id,
      userId
    );
  }

  @Get(":employeeId")
  @RequirePermissions("leave.balance.read_any")
  @ApiOperation({ summary: "Soldes congés payés BF pour un employé (RBAC élargi)." })
  async getBalanceForEmployee(
    @CurrentTenant() tenantContext: TenantContext,
    @Param("employeeId") employeeId: string
  ): Promise<LeaveBalanceSnapshotDto> {
    return this.leaveBalanceService.getBalanceSnapshotForEmployee(
      tenantContext.tenantId,
      employeeId,
      tenantContext.userId
    );
  }
}
