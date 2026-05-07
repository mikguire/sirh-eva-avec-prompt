import { Module } from "@nestjs/common";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LeaveBalanceController } from "./leave-balance.controller";
import { LeaveBalanceService } from "./leave-balance.service";
import { LeaveController } from "./leave.controller";
import { LeaveService } from "./leave.service";

@Module({
  controllers: [LeaveController, LeaveBalanceController],
  providers: [LeaveService, LeaveBalanceService, PrismaService, AuditService]
})
export class LeaveModule {}
