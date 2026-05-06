import { Module } from "@nestjs/common";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LeaveController } from "./leave.controller";
import { LeaveService } from "./leave.service";

@Module({
  controllers: [LeaveController],
  providers: [LeaveService, PrismaService, AuditService]
})
export class LeaveModule {}
