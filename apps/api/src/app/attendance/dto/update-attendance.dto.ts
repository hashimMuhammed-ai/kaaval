import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';

export class UpdateAttendanceDto {
  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus;

  @IsString()
  @IsOptional()
  checkInTime?: string;

  @IsString()
  @IsOptional()
  checkOutTime?: string;

  @IsString()
  @IsOptional()
  checkInNotes?: string;

  @IsString()
  @IsOptional()
  checkOutNotes?: string;

  @IsBoolean()
  @IsOptional()
  verified?: boolean;
}
