import { Module } from "@nestjs/common";
import { AuditService } from "../../common/audit/audit.service";
import { QueueModule } from "../../infra/queue/queue.module";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [QueueModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PrismaService, AuditService]
})
export class NotificationsModule {}
