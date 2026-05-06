import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PermissionsGuard } from "./permissions.guard";

function minimalContext(user?: { permissions: string[] }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({})
  } as unknown as ExecutionContext;
}

describe("PermissionsGuard", () => {
  it("allows when no permissions are required", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(minimalContext({ permissions: [] }))).toBe(true);
  });

  it("allows when required list is empty", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([]) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(guard.canActivate(minimalContext({ permissions: ["employee.read"] }))).toBe(true);
  });

  it("throws when a required permission is missing", () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(["leave.write", "leave.approve"])
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(() => guard.canActivate(minimalContext({ permissions: ["leave.write"] }))).toThrow(
      ForbiddenException
    );
  });

  it("allows when user has all required permissions", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(["employee.read"]) } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);
    expect(
      guard.canActivate(minimalContext({ permissions: ["employee.read", "employee.write"] }))
    ).toBe(true);
  });
});
