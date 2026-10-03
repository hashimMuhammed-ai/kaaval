import { IsString, IsOptional } from 'class-validator';

export class BulkImportCaregiversDto {
  @IsOptional()
  @IsString()
  csvContent?: string;
}

export interface BulkImportErrorRow {
  row: number;
  name?: string;
  phone?: string;
  reason: string;
}

export interface BulkImportSuccessRow {
  id: string;
  fullName: string;
  phone: string;
  district?: string;
  status: string;
  temporaryCredentials: {
    username: string;
    temporaryPassword: string;
    accessCode: string;
    portalUrl: string;
    whatsappOnboardingMessage: string;
  };
}

export interface BulkImportResultDto {
  totalRows: number;
  importedCount: number;
  failedCount: number;
  imported: BulkImportSuccessRow[];
  errors: BulkImportErrorRow[];
}
