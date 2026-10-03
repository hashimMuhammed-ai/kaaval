import { IsOptional, IsString, IsNumber, Min, IsEnum, IsUUID } from 'class-validator';
import { AssignmentStatus } from '../../common/enums/assignment-status.enum';

export class UpdateAssignmentDto {
  @IsEnum(AssignmentStatus)
  @IsOptional()
  status?: AssignmentStatus;

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

  @IsUUID()
  @IsOptional()
  replacedById?: string;

  @IsString()
  @IsOptional()
  replacementReason?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
