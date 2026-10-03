import { IsNotEmpty, IsString, Matches, IsOptional, IsUUID } from 'class-validator';

export class CalculateMonthlySalaryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format (e.g. 2026-09)',
  })
  month: string;

  @IsUUID()
  @IsOptional()
  caregiverId?: string;
}
