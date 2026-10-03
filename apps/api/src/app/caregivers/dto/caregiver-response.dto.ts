import { CaregiverStatus } from '../../common/enums/caregiver-status.enum';

export interface TemporaryCredentialsDto {
  username: string;
  email: string;
  temporaryPassword: string;
  accessCode: string;
  portalUrl: string;
  whatsappOnboardingMessage: string;
}

export interface CaregiverDocumentSummary {
  id: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileKey?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  expiryDate?: Date | string | null;
  expiryStatus?: string;
  daysUntilExpiry?: number | null;
  verified: boolean;
  verifiedAt?: Date | null;
}

export interface CaregiverResponseDto {
  id: string;
  tenantId: string;
  userId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  gender: string;
  dateOfBirth?: Date | string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state: string;
  pincode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  skills: string[];
  experienceYears: number;
  status: CaregiverStatus;
  dailyRate: number;
  liveInRate?: number;
  hourlyRate?: number;
  commissionPercentage?: number;
  rateNotes?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  languages: string[];
  profileSummary?: string | null;
  averageRating: number;
  totalRatings: number;
  jobsCompleted: number;
  notes?: string | null;
  temporaryCredentials?: TemporaryCredentialsDto;
  documents?: CaregiverDocumentSummary[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCaregiverResponseDto {
  success: boolean;
  message: string;
  caregiver: CaregiverResponseDto;
}
