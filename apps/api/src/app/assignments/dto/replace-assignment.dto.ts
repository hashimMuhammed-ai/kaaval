import { IsUUID, IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class ReplaceAssignmentDto {
  @IsUUID()
  @IsNotEmpty()
  replacementCaregiverId: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsOptional()
  @IsString()
  replacementReason?: string;

  @IsOptional()
  @IsString()
  absenceReason?: string;

  @IsOptional()
  @IsString()
  absenceNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  billingRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  caregiverDailyRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
