import { Module } from "@nestjs/common";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PayrollBfController } from "./payroll-bf.controller";
import { PayrollBfCalculator } from "./payroll-bf-calculator";
import { PayrollBfService } from "./payroll-bf.service";

@Module({
  controllers: [PayrollBfController],
  providers: [PayrollBfService, PayrollBfCalculator, PrismaService, AuditService]
})
export class PayrollBfModule {}
