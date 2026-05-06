import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { IS_PUBLIC_KEY } from "./public.decorator";

describe("JwtAuthGuard", () => {
  const minimalContext = (): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({})
    }) as unknown as ExecutionContext;

  it("returns true when route is marked @Public()", () => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === IS_PUBLIC_KEY) {
          return true;
        }
        return undefined;
      })
    } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);
    expect(guard.canActivate(minimalContext())).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalled();
  });
});
