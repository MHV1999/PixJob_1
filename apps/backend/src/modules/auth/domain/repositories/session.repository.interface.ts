export interface CreateSessionData {
  userId: string;
  refreshToken: string;  // already hashed before passed here
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

export interface SessionRecord {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface ISessionRepository {
  create(data: CreateSessionData): Promise<{ id: string }>;
  findByRefreshToken(hashedToken: string): Promise<SessionRecord | null>;
  findActiveSessionsForUser(userId: string): Promise<SessionRecord[]>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}

export const SESSION_REPOSITORY = Symbol('ISessionRepository');
