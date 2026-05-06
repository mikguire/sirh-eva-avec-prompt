import { ExecutionContext, Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ProblemDetailsExceptionFilter } from "./common/http/problem-details.filter";
import { AuthModule } from "./modules/auth/auth.module";
import { EmployeesModule } from "./modules/employees/employees.module";
import { AuditModule } from "./modules/audit/audit.module";
import { BillingModule } from "./modules/billing/billing.module";
import { AdminModule } from "./modules/admin/admin.module";
import { PrismaService } from "./prisma/prisma.service";
import { LeaveModule } from "./modules/leave/leave.module";
import { FilesModule } from "./modules/files/files.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PayrollBfModule } from "./modules/payroll-bf/payroll-bf.module";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 150 }],
      skipIf: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest<{ url?: string; originalUrl?: string }>();
        const path = req.originalUrl ?? req.url ?? "";
        return path.includes("/billing/webhook");
      }
    }),
    AuthModule,
    EmployeesModule,
    LeaveModule,
    FilesModule,
    NotificationsModule,
    PayrollBfModule,
    AuditModule,
    BillingModule,
    AdminModule
  ],
  providers: [
    PrismaService,
    { provide: APP_FILTER, useClass: ProblemDetailsExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard }
  ]
})
export class AppModule {}
