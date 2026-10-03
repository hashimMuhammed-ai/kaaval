import { IsString, IsNotEmpty, IsOptional, IsDateString, MaxLength } from 'class-validator';

export enum CaregiverDocumentType {
  AADHAAR = 'aadhaar',
  NURSING_CERTIFICATE = 'nursing_certificate',
  POLICE_CLEARANCE = 'police_clearance',
  EXPERIENCE_CERTIFICATE = 'experience_certificate',
  CPR_FIRST_AID = 'cpr_first_aid',
  MEDICAL_FITNESS = 'medical_fitness',
  OTHER = 'other',
}

export class UploadDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  documentType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';

export interface CaregiverDocumentResponseDto {
  id: string;
  tenantId: string;
  caregiverId: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileKey?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  expiryDate?: string | Date | null;
  expiryStatus: ExpiryStatus;
  daysUntilExpiry?: number | null;
  verified: boolean;
  verifiedBy?: string | null;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
