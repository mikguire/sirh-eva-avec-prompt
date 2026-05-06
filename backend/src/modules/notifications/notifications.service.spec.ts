import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { Queue } from "bullmq";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  let prisma: {
    notification: { create: jest.Mock; findMany: jest.Mock; update: jest.Mock };
  };
  let audit: { record: jest.Mock };
  let queue: { add: jest.Mock };
  let service: NotificationsService;

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn()
      }
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    queue = { add: jest.fn().mockResolvedValue(undefined) };
    service = new NotificationsService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
      queue as unknown as Queue
    );
  });

  it("enqueue creates notification, audits and pushes job", async () => {
    const created = {
      id: "n1",
      tenantId: "t1",
      userId: null,
      channel: "IN_APP",
      type: "test",
      payload: { a: 1 },
      status: "PENDING",
      createdAt: new Date(),
      sentAt: null
    };
    prisma.notification.create.mockResolvedValue(created);

    const out = await service.enqueue("t1", "u1", {
      channel: NotificationChannel.IN_APP,
      type: "test",
      payload: { a: 1 }
    });

    expect(out.id).toBe("n1");
    expect(queue.add).toHaveBeenCalledWith(
      "send-notification",
      { notificationId: "n1" },
      expect.objectContaining({ attempts: 3 })
    );
    expect(audit.record).toHaveBeenCalled();
  });

  it("dispatchPending marks notifications as sent", async () => {
    const pending = [
      {
        id: "n1",
        tenantId: "t1",
        userId: null,
        channel: NotificationChannel.IN_APP,
        type: "t",
        payload: {},
        status: NotificationStatus.PENDING,
        createdAt: new Date(),
        sentAt: null
      }
    ];
    prisma.notification.findMany.mockResolvedValue(pending);
    prisma.notification.update.mockResolvedValue({ ...pending[0], status: "SENT", sentAt: new Date() });

    const out = await service.dispatchPending(10);
    expect(out.processed).toBe(1);
    expect(prisma.notification.update).toHaveBeenCalled();
  });
});
