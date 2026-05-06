jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://s3.example/presigned")
}));

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AuditService } from "../../common/audit/audit.service";
import { PrismaService } from "../../prisma/prisma.service";
import { FilesService } from "./files.service";

describe("FilesService", () => {
  let prisma: { document: { create: jest.Mock } };
  let audit: { record: jest.Mock };
  let service: FilesService;

  beforeEach(() => {
    prisma = { document: { create: jest.fn().mockResolvedValue({}) } };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new FilesService(prisma as unknown as PrismaService, audit as unknown as AuditService);
    jest.mocked(getSignedUrl).mockClear();
    jest.mocked(getSignedUrl).mockResolvedValue("https://s3.example/presigned");
  });

  it("presigns upload, persists document metadata and audits", async () => {
    const out = await service.createPresignedUpload("tenant_a", "user_1", {
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      employeeId: "emp1"
    });

    expect(out.uploadUrl).toBe("https://s3.example/presigned");
    expect(out.objectKey).toContain("tenant_a/");
    expect(out.expiresIn).toBe(900);
    expect(getSignedUrl).toHaveBeenCalled();
    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "tenant_a",
          employeeId: "emp1",
          fileName: "doc.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1024,
          uploadedById: "user_1"
        })
      })
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "document.presign_upload", tenantId: "tenant_a" })
    );
  });

  it("uses system as uploader when actor is undefined", async () => {
    await service.createPresignedUpload("t1", undefined, {
      fileName: "a.bin",
      mimeType: "application/octet-stream",
      sizeBytes: 10
    });
    expect(prisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ uploadedById: "system" })
      })
    );
  });
});
