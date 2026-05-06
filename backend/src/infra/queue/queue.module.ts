import { Global, Module } from "@nestjs/common";
import { Queue } from "bullmq";
import { NOTIFICATIONS_QUEUE, REDIS_CONNECTION } from "./queue.tokens";

function redisConnectionFromEnv(): { host: string; port: number; password?: string } {
  const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");
  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || "6379"),
    password: redisUrl.password || undefined
  };
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CONNECTION,
      useFactory: (): { host: string; port: number; password?: string } => {
        return redisConnectionFromEnv();
      }
    },
    {
      provide: NOTIFICATIONS_QUEUE,
      useFactory: (
        connection: { host: string; port: number; password?: string }
      ): Queue => {
        return new Queue("notifications", { connection });
      },
      inject: [REDIS_CONNECTION]
    }
  ],
  exports: [REDIS_CONNECTION, NOTIFICATIONS_QUEUE]
})
export class QueueModule {}
