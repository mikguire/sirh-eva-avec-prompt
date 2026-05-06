import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class PresignUploadDto {
  @IsString()
  fileName!: string;

  @IsString()
  mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(50_000_000)
  sizeBytes!: number;

  @IsOptional()
  @IsString()
  employeeId?: string;
}
