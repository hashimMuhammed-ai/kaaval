export interface ProvisionedTenantInfo {
  id: string;
  name: string;
  subdomain: string;
  tenantSlug: string;
  customDomain?: string | null;
  status: string;
  phone?: string | null;
  email?: string | null;
  createdAt: Date;
}

export interface ProvisionedOwnerInfo {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  isActive: boolean;
}

export interface InitialCredentialsInfo {
  temporaryPassword?: string;
  inviteToken: string;
  inviteExpiresAt: Date;
  onboardingUrl: string;
  whatsappOnboardingMessage: string;
}

export interface PaymentConfirmationRecord {
  paymentReference: string;
  paymentMethod: string;
  confirmedVia: string;
  amount?: number;
  notes?: string;
  confirmedAt: Date;
}

export class ProvisionTenantResponseDto {
  success: boolean;
  message: string;
  tenant: ProvisionedTenantInfo;
  owner: ProvisionedOwnerInfo;
  credentials: InitialCredentialsInfo;
  paymentConfirmation: PaymentConfirmationRecord;
}
