import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

describe("AuthController", () => {
  const authService = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn()
  } as unknown as jest.Mocked<AuthService>;

  const controller = new AuthController(authService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates login to auth service", async () => {
    authService.login.mockResolvedValue({ accessToken: "access", refreshToken: "refresh" });

    const out = await controller.login({
      email: "u@eva.test",
      password: "Password1!",
      tenantId: "tenant_1"
    });

    expect(out).toEqual({ accessToken: "access", refreshToken: "refresh" });
    expect(authService.login).toHaveBeenCalledWith({
      email: "u@eva.test",
      password: "Password1!",
      tenantId: "tenant_1"
    });
  });

  it("delegates refresh to auth service", async () => {
    authService.refresh.mockResolvedValue({ accessToken: "new-access", refreshToken: "new-refresh" });

    const out = await controller.refresh({ refreshToken: "old-refresh" });

    expect(out).toEqual({ accessToken: "new-access", refreshToken: "new-refresh" });
    expect(authService.refresh).toHaveBeenCalledWith("old-refresh");
  });

  it("delegates logout and returns success", async () => {
    authService.logout.mockResolvedValue(undefined);

    const out = await controller.logout({ refreshToken: "refresh" });

    expect(out).toEqual({ success: true });
    expect(authService.logout).toHaveBeenCalledWith("refresh");
  });
});
