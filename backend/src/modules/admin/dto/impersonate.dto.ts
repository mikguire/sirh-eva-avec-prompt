import { IsString } from "class-validator";

export class ImpersonateDto {
  @IsString()
  tenantId!: string;

  @IsString()
  userId!: string;
}
