import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiExtraModels, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/auth/jwt-auth.guard";
import { RequirePermissions } from "../../common/rbac/permissions.decorator";
import { PermissionsGuard } from "../../common/rbac/permissions.guard";
import { CurrentTenant } from "../../common/tenancy/tenant-context.decorator";
import { TenantContext } from "../../common/tenancy/tenant-context";
import { TenantContextGuard } from "../../common/tenancy/tenant-context.guard";
import { PresignUploadDto } from "./dto/presign-upload.dto";
import { FilesService } from "./files.service";
import { ApiProblemResponsesForAuthedRoutes, ProblemDetailsSchema } from "../../common/http/problem-details.swagger";

@ApiTags("files")
@ApiExtraModels(ProblemDetailsSchema)
@ApiProblemResponsesForAuthedRoutes()
@Controller("files")
@UseGuards(JwtAuthGuard, TenantContextGuard, PermissionsGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("presign-upload")
  @RequirePermissions("employee.write")
  createPresignedUpload(
    @CurrentTenant() tenantContext: TenantContext,
    @Body() dto: PresignUploadDto
  ): Promise<{ uploadUrl: string; objectKey: string; expiresIn: number }> {
    return this.filesService.createPresignedUpload(
      tenantContext.tenantId,
      tenantContext.userId,
      dto
    );
  }
}
