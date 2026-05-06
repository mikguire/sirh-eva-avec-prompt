import { IsDateString, IsEmail, IsOptional, IsString } from "class-validator";

export class CreateEmployeeDto {
  @IsEmail()
  workEmail!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsDateString()
  hireDate!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  positionId?: string;
}
