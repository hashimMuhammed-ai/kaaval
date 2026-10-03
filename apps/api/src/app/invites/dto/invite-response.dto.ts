import { UserRole } from '../../common/enums/user-role.enum';

export interface InviteSummary {
  id: string;
  inviteToken: string;
  tenantId: string;
  tenantName?: string;
  subdomain?: string;
  role: UserRole;
  email?: string | null;
  expiresAt: Date;
  usedAt?: Date | null;
  status: 'active' | 'used' | 'expired';
  onboardingUrl?: string;
  whatsappInviteMessage?: string;
  createdAt: Date;
}

export class CreateInviteResponseDto {
  success: boolean;
  message: string;
  invite: InviteSummary;
}

export class ValidateInviteResponseDto {
  valid: boolean;
  message?: string;
  tenant: {
    id: string;
    name: string;
    subdomain: string;
  };
  invite: {
    role: UserRole;
    email?: string | null;
    expiresAt: Date;
  };
}

export class AcceptInviteResponseDto {
  success: boolean;
  message: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    tenantId: string;
  };
}
