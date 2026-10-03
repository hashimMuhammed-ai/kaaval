import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class AdminLeadAlertDto {
  @IsString()
  @IsNotEmpty()
  referenceId: string;

  @IsString()
  @IsNotEmpty()
  patientName: string;

  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @IsString()
  @IsNotEmpty()
  duration: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsOptional()
  locality?: string;

  @IsString()
  @IsOptional()
  patientAge?: string;

  @IsString()
  @IsOptional()
  genderPreference?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  tenantId?: string;

  @IsString()
  @IsOptional()
  agencyName?: string;

  @IsString()
  @IsOptional()
  requestId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isAutoCaptured?: boolean;
}
