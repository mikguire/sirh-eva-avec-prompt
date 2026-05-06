import { NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminService } from "./admin.service";

describe("AdminService", () => {
  let prisma: { tenantUser: { findUnique: jest.Mock } };
  let jwtService: { signAsync: jest.Mock };
  let audit: { record: jest.Mock };
  let service: AdminService;

  beforeEach(() => {
    prisma = { tenantUser: { findUnique: jest.fn() } };
    jwtService = { signAsync: jest.fn() };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AdminService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
      audit as unknown as AuditService
    );
  });

  it("throws when membership is missing", async () => {
    prisma.tenantUser.findUnique.mockResolvedValue(null);
    await expect(service.createImpersonationToken("actor", "t1", "u1")).rejects.toThrow(NotFoundException);
  });

  it("issues impersonation token and audits", async () => {
    prisma.tenantUser.findUnique.mockResolvedValue({
      id: "tu1",
      tenantId: "t1",
      userId: "u1",
      roleId: "r1",
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
      role: {
        id: "r1",
        tenantId: null,
        name: "owner",
        description: null,
        isSystem: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        permissions: [
          {
            roleId: "r1",
            permissionId: "p1",
            permission: {
              id: "p1",
              key: "tenant.manage",
              description: null,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ]
      }
    });
    jwtService.signAsync.mockResolvedValue("impersonation.jwt");

    const out = await service.createImpersonationToken("actor-admin", "t1", "u1");
    expect(out.accessToken).toBe("impersonation.jwt");
    expect(out.expiresIn).toBe(600);
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: "u1",
        tenantId: "t1",
        impersonatedBy: "actor-admin"
      }),
      expect.objectContaining({ expiresIn: "10m" })
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.impersonate", entityId: "u1" })
    );
  });
});
