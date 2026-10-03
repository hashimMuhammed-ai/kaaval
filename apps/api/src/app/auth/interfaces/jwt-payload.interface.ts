import { UserRole } from '../../common/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  userId: string;
  email: string;
  tenantId: string | null;
  role: UserRole;
  name: string;
  iat?: number;
  exp?: number;
}
