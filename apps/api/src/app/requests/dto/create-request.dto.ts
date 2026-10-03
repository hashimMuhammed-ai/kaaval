import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';

export class CreateCaregiverRequestDto {
  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @IsString()
  @IsNotEmpty()
  duration: string;

  @IsOptional()
  @IsString()
  engagementPeriod?: string;

  @IsOptional()
  @IsString()
  genderPreference?: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsOptional()
  @IsString()
  locality?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsString()
  @IsNotEmpty()
  patientName: string;

  @IsOptional()
  @IsString()
  patientAge?: string;

  @IsOptional()
  @IsString()
  patientGender?: string;

  @IsOptional()
  @IsString()
  patientCondition?: string;

  @IsOptional()
  @IsString()
  mobilityStatus?: string;

  @IsOptional()
  @IsString()
  medicalEquipment?: string;

  @IsString()
  @IsNotEmpty()
  contactName: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsOptional()
  @IsBoolean()
  isWhatsapp?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  agencyName?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsString()
  subdomain?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
