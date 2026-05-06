import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { TenantContextGuard } from "./tenant-context.guard";

function createContext(overrides: {
  headers?: Record<string, string | undefined>;
  user?: { sub: string; tenantId?: string };
}): ExecutionContext {
  const request = {
    headers: { ...(overrides.headers ?? {}) },
    user: overrides.user
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request
    })
  } as unknown as ExecutionContext;
}

describe("TenantContextGuard", () => {
  const guard = new TenantContextGuard();

  it("throws when x-tenant-id is missing", () => {
    const ctx = createContext({ headers: {} });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(ctx)).toThrow(/x-tenant-id/);
  });

  it("throws when header tenant does not match JWT tenant", () => {
    const ctx = createContext({
      headers: { "x-tenant-id": "tenant_b" },
      user: { sub: "u1", tenantId: "tenant_a" }
    });
    expect(() => guard.canActivate(ctx)).toThrow(/does not match/);
  });

  it("allows when header matches JWT tenant", () => {
    const ctx = createContext({
      headers: { "x-tenant-id": "tenant_a" },
      user: { sub: "u1", tenantId: "tenant_a" }
    });
    expect(guard.canActivate(ctx)).toBe(true);
    const req = ctx.switchToHttp().getRequest<{ tenantContext?: { tenantId: string; userId?: string } }>();
    expect(req.tenantContext?.tenantId).toBe("tenant_a");
    expect(req.tenantContext?.userId).toBe("u1");
  });

  it("allows when only header is set (no JWT user yet)", () => {
    const ctx = createContext({
      headers: { "x-tenant-id": "tenant_only" }
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
