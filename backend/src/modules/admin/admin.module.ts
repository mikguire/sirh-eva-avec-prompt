import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AdminController],
  providers: [PrismaService, AdminService, AuditService]
})
export class AdminModule {}
