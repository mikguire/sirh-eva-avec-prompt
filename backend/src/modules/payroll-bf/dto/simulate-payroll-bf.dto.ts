import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";

export enum PayrollBfEmployeeRegime {
  PRIVE = "PRIVE",
  PUBLIC_CARFO = "PUBLIC_CARFO"
}

export class SimulatePayrollBfDto {
  @IsDateString()
  payrollDate!: string;

  @IsEnum(PayrollBfEmployeeRegime)
  employeeRegime!: PayrollBfEmployeeRegime;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  baseSalaryXof!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  taxableBonusXof?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  taxableOvertimeXof?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  nontaxableAllowanceXof?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  housingAllowanceXof?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  functionAllowanceXof?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  transportAllowanceXof?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  numberOfChildren?: number;

  @IsString()
  @IsOptional()
  maritalStatus?: string;

  @Type(() => Boolean)
  @IsOptional()
  isCadre?: boolean;

  @IsString()
  legalProfileId!: string;
}
