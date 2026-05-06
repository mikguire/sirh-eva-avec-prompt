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

  @IsString()
  legalProfileId!: string;
}
