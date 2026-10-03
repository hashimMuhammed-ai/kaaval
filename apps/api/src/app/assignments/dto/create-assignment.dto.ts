import { IsNotEmpty, IsUUID, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @IsUUID()
  @IsNotEmpty()
  caregiverId: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  billingRate?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  caregiverDailyRate?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
