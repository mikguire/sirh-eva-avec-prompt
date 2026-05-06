import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "./auth.service";

jest.mock("argon2", () => ({
  verify: jest.fn(),
  hash: jest.fn()
}));

type PrismaAuthMock = {
  user: { findUnique: jest.Mock };
  tenantUser: { findUnique: jest.Mock };
  userSession: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
};

describe("AuthService", () => {
  let prisma: PrismaAuthMock;
  let jwtService: jest.Mocked<Pick<JwtService, "signAsync" | "verifyAsync">>;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      tenantUser: { findUnique: jest.fn() },
      userSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn()
      }
    };
    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn()
    } as unknown as jest.Mocked<Pick<JwtService, "signAsync" | "verifyAsync">>;
    service = new AuthService(prisma as unknown as PrismaService, jwtService as unknown as JwtService);
    jest.mocked(argon2.verify).mockReset();
  });

  describe("login", () => {
    it("throws when user is unknown", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: "x@test.fr", password: "Password1!", tenantId: "t1" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws when password is invalid", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@test.fr",
        passwordHash: "hash",
        firstName: "A",
        lastName: "B",
        status: "ACTIVE",
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      jest.mocked(argon2.verify).mockResolvedValue(false);
      await expect(
        service.login({ email: "a@test.fr", password: "WrongPass1!", tenantId: "t1" })
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws when user is not a member of the tenant", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@test.fr",
        passwordHash: "hash",
        firstName: "A",
        lastName: "B",
        status: "ACTIVE",
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      jest.mocked(argon2.verify).mockResolvedValue(true);
      prisma.tenantUser.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: "a@test.fr", password: "Password1!", tenantId: "t1" })
      ).rejects.toThrow(/not a member/);
    });

    it("returns tokens and creates session on success", async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: "u1",
        email: "a@test.fr",
        passwordHash: "hash",
        firstName: "A",
        lastName: "B",
        status: "ACTIVE",
        mfaEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      jest.mocked(argon2.verify).mockResolvedValue(true);
      prisma.tenantUser.findUnique.mockResolvedValue({
        id: "tu1",
        tenantId: "t1",
        userId: "u1",
        roleId: "role_owner",
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
        role: {
          id: "role_owner",
          tenantId: null,
          name: "owner",
          description: null,
          isSystem: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          permissions: [
            {
              roleId: "role_owner",
              permissionId: "p1",
              permission: { id: "p1", key: "employee.read", description: null, createdAt: new Date(), updatedAt: new Date() }
            }
          ]
        }
      });
      jwtService.signAsync.mockResolvedValueOnce("access.jwt").mockResolvedValueOnce("refresh.jwt");
      prisma.userSession.create.mockResolvedValue({
        id: "s1",
        userId: "u1",
        tenantId: "t1",
        refreshToken: "refresh.jwt",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(),
        revokedAt: null,
        createdAt: new Date()
      });

      const out = await service.login({ email: "a@test.fr", password: "Password1!", tenantId: "t1" });
      expect(out.accessToken).toBe("access.jwt");
      expect(out.refreshToken).toBe("refresh.jwt");
      expect(prisma.userSession.create).toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("throws when JWT verify fails", async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error("jwt expired"));
      await expect(service.refresh("bad")).rejects.toThrow();
    });

    it("throws when session is missing", async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: "u1",
        tenantId: "t1",
        role: "owner",
        permissions: []
      });
      prisma.userSession.findUnique.mockResolvedValue(null);
      await expect(service.refresh("tok")).rejects.toThrow(UnauthorizedException);
    });

    it("throws when session is revoked", async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: "u1",
        tenantId: "t1",
        role: "owner",
        permissions: []
      });
      prisma.userSession.findUnique.mockResolvedValue({
        id: "s1",
        userId: "u1",
        tenantId: "t1",
        refreshToken: "tok",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date(),
        createdAt: new Date()
      });
      await expect(service.refresh("tok")).rejects.toThrow(UnauthorizedException);
    });

    it("throws when session is expired", async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: "u1",
        tenantId: "t1",
        role: "owner",
        permissions: []
      });
      prisma.userSession.findUnique.mockResolvedValue({
        id: "s1",
        userId: "u1",
        tenantId: "t1",
        refreshToken: "tok",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
        createdAt: new Date()
      });
      await expect(service.refresh("tok")).rejects.toThrow(UnauthorizedException);
    });

    it("rotates refresh token when session is valid", async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: "u1",
        tenantId: "t1",
        role: "owner",
        permissions: ["employee.read"]
      });
      prisma.userSession.findUnique.mockResolvedValue({
        id: "s1",
        userId: "u1",
        tenantId: "t1",
        refreshToken: "old",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        createdAt: new Date()
      });
      jwtService.signAsync.mockResolvedValueOnce("new.access").mockResolvedValueOnce("new.refresh");
      prisma.userSession.update.mockResolvedValue({
        id: "s1",
        userId: "u1",
        tenantId: "t1",
        refreshToken: "new.refresh",
        userAgent: null,
        ipAddress: null,
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        createdAt: new Date()
      });

      const out = await service.refresh("old");
      expect(out.accessToken).toBe("new.access");
      expect(out.refreshToken).toBe("new.refresh");
      expect(prisma.userSession.update).toHaveBeenCalled();
    });
  });

  describe("logout", () => {
    it("revokes active sessions for the refresh token", async () => {
      prisma.userSession.updateMany.mockResolvedValue({ count: 1 });
      await service.logout("tok");
      expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
        where: { refreshToken: "tok", revokedAt: null },
        data: { revokedAt: expect.any(Date) }
      });
    });
  });
});
