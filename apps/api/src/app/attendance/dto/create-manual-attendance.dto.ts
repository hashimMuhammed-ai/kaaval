import { IsNotEmpty, IsUUID, IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';

export class CreateManualAttendanceDto {
  @IsUUID()
  @IsNotEmpty()
  assignmentId: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsEnum(AttendanceStatus)
  @IsOptional()
  status?: AttendanceStatus = AttendanceStatus.PRESENT;

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
