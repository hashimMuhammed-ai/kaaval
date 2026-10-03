import { UserRole } from '../../common/enums/user-role.enum';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string | null;
  phone?: string | null;
}

export interface TenantSummary {
  id: string;
  name: string;
  subdomain: string;
}

export class LoginResponseDto {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  user: UserSummary;
  tenant?: TenantSummary | null;
}
