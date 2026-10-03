import { CaregiverStatusType } from '../constants/caregiver-status';

export type { CaregiverStatusType };

export interface CaregiverDocumentItem {
  id: string;
  caregiverId?: string;
  documentType: string;
  title: string;
  fileUrl: string;
  fileKey?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  expiryDate?: string | null;
  verified: boolean;
  expiryStatus?: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';
  daysUntilExpiry?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaregiverCurrentAssignment {
  id: string;
  customerId?: string;
  customerName?: string;
  patientName?: string;
  startDate?: string;
  status?: string;
}

export interface Caregiver {
  id: string;
  userId?: string;
  tenantId?: string;
  fullName: string;
  phone: string;
  email?: string | null;
  gender?: string;
  dateOfBirth?: string;
  district?: string;
  city?: string;
  address?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  skills: string[];
  experienceYears: number;
  languages?: string[];
  dailyRate: number;
  liveInRate?: number;
  hourlyRate?: number;
  commissionPercentage?: number;
  rateNotes?: string;
  status: CaregiverStatusType;
  notes?: string;
  profileSummary?: string;
  averageRating?: number;
  totalRatings?: number;
  jobsCompleted?: number;
  documents?: CaregiverDocumentItem[];
  currentAssignment?: CaregiverCurrentAssignment | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CaregiverStatusCounts {
  available: number;
  assigned: number;
  on_leave: number;
  inactive: number;
  total: number;
  occupancyRate: number;
}

export interface TemporaryCredentials {
  username: string;
  temporaryPassword: string;
  accessCode: string;
  portalUrl: string;
}

export interface BulkImportSuccessItem {
  rowNumber: number;
  caregiverId: string;
  fullName: string;
  phone: string;
  email?: string;
  temporaryCredentials: TemporaryCredentials;
}

export interface BulkImportErrorItem {
  rowNumber: number;
  fullName?: string;
  phone?: string;
  reason: string;
}

export interface BulkImportResult {
  totalProcessed: number;
  successfulCount: number;
  skippedCount: number;
  successfulImports: BulkImportSuccessItem[];
  errors: BulkImportErrorItem[];
}
