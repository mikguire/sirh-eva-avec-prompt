import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { TenantContext } from "./tenant-context";

export const CurrentTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<{ tenantContext?: TenantContext }>();
    if (!request.tenantContext) {
      throw new UnauthorizedException("Missing tenant context");
    }

    return request.tenantContext;
  }
);
