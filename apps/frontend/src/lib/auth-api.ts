import { apiClient } from './api-client';
import type { UserRole, UserStatus, AuthTokens } from '@pixjob/shared-types';

// ─── Request types ─────────────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  identifier: string;  // email or username
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

// ─── Response types ────────────────────────────────────────────────────────────

export interface UserDto {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  status: UserStatus;
  roles: UserRole[];
  createdAt: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserDto;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: RegisterRequest): Promise<RegisterResponse> =>
    apiClient.post<RegisterResponse>('/auth/register', data),

  login: (data: LoginRequest): Promise<AuthResponse> =>
    apiClient.post<AuthResponse>('/auth/login', data),

  refresh: (): Promise<{ accessToken: string; expiresIn: number }> =>
    apiClient.post<{ accessToken: string; expiresIn: number }>('/auth/refresh', {}),

  logout: (refreshToken: string): Promise<void> =>
    apiClient.post<void>('/auth/logout', { refreshToken }),

  verifyEmail: (data: VerifyEmailRequest): Promise<{ message: string }> =>
    apiClient.post<{ message: string }>('/auth/verify-email', data),

  me: (): Promise<UserDto> =>
    apiClient.get<UserDto>('/users/me'),
};
