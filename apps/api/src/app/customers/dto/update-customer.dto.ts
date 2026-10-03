import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { CustomerStatus } from '../../common/enums/customer-status.enum';

export class UpdateCustomerDto {
  @IsOptional()
  @IsUUID()
  requestId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  patientName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  patientAge?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  patientGender?: string;

  @IsOptional()
  @IsString()
  patientCondition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  mobilityStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  medicalEquipment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  primaryContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  relationship?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  alternatePhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsBoolean()
  isWhatsapp?: boolean;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  locality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  serviceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  duration?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  engagementPeriod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  genderPreference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  startDate?: string;

  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @IsOptional()
  @IsUUID()
  assignedCaregiverId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string;
}
