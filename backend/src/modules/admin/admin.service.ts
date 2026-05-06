import { Injectable, NotFoundException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuditService } from "../../common/audit/audit.service";
import { getJwtAccessSecret } from "../../config/jwt-secrets";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService
  ) {}

  async createImpersonationToken(
    actorUserId: string,
    tenantId: string,
    userId: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: {
        role: {
          include: { permissions: { include: { permission: true } } }
        }
      }
    });
    if (!tenantUser) {
      throw new NotFoundException("User membership not found for tenant");
    }

    const permissions = tenantUser.role.permissions.map((entry) => entry.permission.key);
    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        tenantId,
        role: tenantUser.role.name,
        permissions,
        impersonatedBy: actorUserId
      },
      {
        secret: getJwtAccessSecret(),
        expiresIn: "10m"
      }
    );

    await this.auditService.record({
      tenantId,
      actorUserId,
      action: "admin.impersonate",
      entityType: "user",
      entityId: userId,
      afterJson: { impersonatedBy: actorUserId }
    });

    return { accessToken, expiresIn: 600 };
  }
}
