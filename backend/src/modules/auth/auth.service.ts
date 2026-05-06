import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { randomUUID } from "crypto";
import { getJwtAccessSecret, getJwtRefreshSecret } from "../../config/jwt-secrets";
import { PrismaService } from "../../prisma/prisma.service";

interface LoginInput {
  email: string;
  password: string;
  tenantId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService
  ) {}

  async login(input: LoginInput): Promise<{ accessToken: string; refreshToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email }
    });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isValidPassword = await argon2.verify(user.passwordHash, input.password);
    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: input.tenantId,
          userId: user.id
        }
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    });

    if (!tenantUser) {
      throw new UnauthorizedException("User is not a member of this tenant");
    }

    const permissions = tenantUser.role.permissions.map((entry) => entry.permission.key);
    const payload = {
      sub: user.id,
      tenantId: input.tenantId,
      role: tenantUser.role.name,
      permissions
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: getJwtAccessSecret(),
      expiresIn: "15m"
    });
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, jti: randomUUID() },
      {
        secret: getJwtRefreshSecret(),
        expiresIn: "30d"
      }
    );
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        tenantId: input.tenantId,
        refreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = await this.jwtService.verifyAsync<{
      sub: string;
      tenantId: string;
      role: string;
      permissions: string[];
    }>(refreshToken, {
      secret: getJwtRefreshSecret()
    });

    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken }
    });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const newAccessToken = await this.jwtService.signAsync(
      {
        sub: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        permissions: payload.permissions
      },
      {
        secret: getJwtAccessSecret(),
        expiresIn: "15m"
      }
    );

    const newRefreshToken = await this.jwtService.signAsync(
      {
        sub: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        permissions: payload.permissions,
        jti: randomUUID()
      },
      {
        secret: getJwtRefreshSecret(),
        expiresIn: "30d"
      }
    );

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { refreshToken, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
}
