import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { TenantContext } from "./tenant-context";
import { tenantRlsStorage } from "./tenant-rls.storage";

type RequestWithContext = {
  headers: Record<string, string | undefined>;
  user?: { sub: string; tenantId?: string };
  tenantContext?: TenantContext;
};

@Injectable()
export class TenantContextGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const tenantId = request.headers["x-tenant-id"];

    if (!tenantId) {
      throw new UnauthorizedException("x-tenant-id header is required");
    }
    if (request.user?.tenantId && request.user.tenantId !== tenantId) {
      throw new UnauthorizedException("Tenant header does not match authenticated tenant");
    }

    request.tenantContext = {
      tenantId,
      userId: request.user?.sub
    };
    tenantRlsStorage.enterWith({ tenantId });
    return true;
  }
}
