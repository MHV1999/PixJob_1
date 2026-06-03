import type { UserRole, UserStatus } from './enums';

export interface JwtPayload {
  sub: string;       // user UUID
  email: string;
  roles: UserRole[];
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserSummary {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  status: UserStatus;
  roles: UserRole[];
}
