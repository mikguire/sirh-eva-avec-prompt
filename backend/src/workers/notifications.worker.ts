import { NotificationStatus, PrismaClient } from "@prisma/client";
import { Job, Worker } from "bullmq";

const prisma = new PrismaClient();
const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || "6379"),
  password: redisUrl.password || undefined
};

interface NotificationJobData {
  notificationId: string;
}

async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: job.data.notificationId }
  });
  if (!notification || notification.status !== NotificationStatus.PENDING) {
    return;
  }

  await prisma.notification.update({
    where: { id: notification.id },
    data: {
      status: NotificationStatus.SENT,
      sentAt: new Date()
    }
  });
}

const worker = new Worker<NotificationJobData>("notifications", processNotification, {
  connection
});

worker.on("failed", (job, error) => {
  console.error("notification job failed", { jobId: job?.id, error });
});
