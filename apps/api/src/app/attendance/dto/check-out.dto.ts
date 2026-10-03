import { IsOptional, IsUUID, IsNumber, IsString, IsEnum } from 'class-validator';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';

export class CheckOutDto {
  @IsUUID()
  @IsOptional()
  assignmentId?: string;

  @IsUUID()
  @IsOptional()
  attendanceId?: string;

  @IsString()
  @IsOptional()
  date?: string;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  checkOutTime?: string;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;
}
