import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator";

type RequestWithPermissions = {
  user?: { permissions?: string[] };
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithPermissions>();
    const actualPermissions = new Set(request.user?.permissions ?? []);
    const isAuthorized = required.every((permission) => actualPermissions.has(permission));

    if (!isAuthorized) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
