import { Inject, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { Notification, NotificationStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { AuditService } from "../../common/audit/audit.service";
import { NOTIFICATIONS_QUEUE } from "../../infra/queue/queue.tokens";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    @Inject(NOTIFICATIONS_QUEUE) private readonly notificationsQueue: Queue
  ) {}

  async enqueue(
    tenantId: string,
    actorUserId: string | undefined,
    dto: CreateNotificationDto
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId: dto.userId,
        channel: dto.channel,
        type: dto.type,
        payload: dto.payload as Prisma.InputJsonValue
      }
    });
    await this.auditService.record({
      tenantId,
      actorUserId,
      action: "notification.enqueue",
      entityType: "notification",
      entityId: notification.id,
      afterJson: notification
    });
    await this.notificationsQueue.add(
      "send-notification",
      { notificationId: notification.id },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    return notification;
  }

  async dispatchPending(limit = 50): Promise<{ processed: number }> {
    const pending = await this.prisma.notification.findMany({
      where: { status: NotificationStatus.PENDING },
      take: limit,
      orderBy: { createdAt: "asc" }
    });

    for (const item of pending) {
      await this.prisma.notification.update({
        where: { id: item.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date()
        }
      });
    }

    return { processed: pending.length };
  }
}
