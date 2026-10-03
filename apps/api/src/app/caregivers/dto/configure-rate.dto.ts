import { IsNotEmpty, IsNumber, Min, Max, IsOptional, IsString } from 'class-validator';

export class ConfigureRateDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  dailyRate: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  liveInRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  hourlyRate?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  commissionPercentage?: number;

  @IsString()
  @IsOptional()
  rateNotes?: string;
}

export interface CaregiverRateConfigurationResult {
  caregiverId: string;
  fullName: string;
  dailyRate: number;
  liveInRate: number;
  hourlyRate: number;
  commissionPercentage: number;
  rateNotes?: string | null;
  takeHomeEstimateDaily: number;
  agencyCommissionDaily: number;
}
