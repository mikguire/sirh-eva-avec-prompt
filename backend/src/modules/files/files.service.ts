import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PresignUploadDto } from "./dto/presign-upload.dto";

@Injectable()
export class FilesService {
  private readonly s3Client: S3Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION ?? "eu-west-1",
      endpoint: process.env.S3_ENDPOINT,
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? "false") === "true",
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            }
          : undefined
    });
  }

  async createPresignedUpload(
    tenantId: string,
    actorUserId: string | undefined,
    dto: PresignUploadDto
  ): Promise<{ uploadUrl: string; objectKey: string; expiresIn: number }> {
    const objectKey = `${tenantId}/${randomUUID()}-${dto.fileName}`;
    const expiresIn = 900;
    const bucket = process.env.S3_BUCKET ?? "eva-documents";
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      ContentType: dto.mimeType,
      ContentLength: dto.sizeBytes
    });
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    await this.prisma.document.create({
      data: {
        tenantId,
        employeeId: dto.employeeId,
        bucket,
        objectKey,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        uploadedById: actorUserId ?? "system"
      }
    });

    await this.auditService.record({
      tenantId,
      actorUserId,
      action: "document.presign_upload",
      entityType: "document",
      entityId: objectKey,
      afterJson: dto
    });

    return { uploadUrl, objectKey, expiresIn };
  }
}
