import { IsOptional, IsEnum, IsUUID, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';

export class QueryAttendanceDto {
  @IsUUID()
  @IsOptional()
  assignmentId?: string;

  @IsUUID()
  @IsOptional()
  caregiverId?: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  month?: string; // e.g. "2026-09" or "09"

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  year?: number;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 31;
}
