import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { ApiProblemResponsesForAuthedRoutes, ProblemDetailsSchema } from "../../common/http/problem-details.swagger";
import { RequirePermissions } from "../../common/rbac/permissions.decorator";
import { PermissionsGuard } from "../../common/rbac/permissions.guard";
import { CurrentTenant } from "../../common/tenancy/tenant-context.decorator";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { TenantContextGuard } from "../../common/tenancy/tenant-context.guard";
import { PayrollBfSimulationResponseDto } from "./dto/payroll-bf-simulation-response.dto";
import { SimulatePayrollBfDto } from "./dto/simulate-payroll-bf.dto";
import { PayrollBfService } from "./payroll-bf.service";

@ApiTags("payroll-bf")
@ApiExtraModels(ProblemDetailsSchema)
@ApiProblemResponsesForAuthedRoutes()
@Controller("payroll-bf")
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class PayrollBfController {
  constructor(private readonly payrollBfService: PayrollBfService) {}

  @Post("simulate")
  @RequirePermissions("payroll.simulate")
  simulate(
    @CurrentTenant() tenantContext: TenantContext,
    @Body() dto: SimulatePayrollBfDto
  ): Promise<PayrollBfSimulationResponseDto> {
    return this.payrollBfService.simulate(tenantContext.tenantId, tenantContext.userId, dto);
  }
}
