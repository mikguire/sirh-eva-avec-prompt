import { TenantContext } from "../../common/tenancy/tenant-context";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

describe("FilesController", () => {
  const filesService = {
    createPresignedUpload: jest.fn()
  } as unknown as jest.Mocked<FilesService>;

  const controller = new FilesController(filesService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a presigned upload using tenant and actor context", async () => {
    const response = {
      uploadUrl: "https://upload.example",
      objectKey: "tenant_1/contracts/doc.pdf",
      expiresIn: 900
    };
    filesService.createPresignedUpload.mockResolvedValue(response);

    const dto = {
      fileName: "doc.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12345
    };

    const out = await controller.createPresignedUpload(
      { tenantId: "tenant_1", userId: "actor_1" } as TenantContext,
      dto
    );

    expect(out).toEqual(response);
    expect(filesService.createPresignedUpload).toHaveBeenCalledWith("tenant_1", "actor_1", dto);
  });
});
