import { IsNotEmpty, IsUUID, IsOptional, IsNumber, IsString } from 'class-validator';

export class CheckInDto {
  @IsUUID()
  @IsNotEmpty()
  assignmentId: string;

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
  checkInTime?: string;
}
