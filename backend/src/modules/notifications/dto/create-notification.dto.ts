import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { NotificationChannel } from "@prisma/client";

export class CreateNotificationDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsEnum(NotificationChannel)
  channel!: NotificationChannel;

  @IsString()
  type!: string;

  @IsObject()
  payload!: Record<string, unknown>;
}
