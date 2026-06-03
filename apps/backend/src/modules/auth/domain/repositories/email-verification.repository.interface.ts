export interface CreateEmailVerificationData {
  userId: string;
  token: string;   // already hashed before passed here
  expiresAt: Date;
}

export interface VerificationRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface IEmailVerificationRepository {
  create(data: CreateEmailVerificationData): Promise<{ id: string }>;
  findByToken(hashedToken: string): Promise<VerificationRecord | null>;
  findPendingForUser(userId: string): Promise<VerificationRecord[]>;
  markUsed(id: string): Promise<void>;
  deleteExpiredForUser(userId: string): Promise<void>;
}

export const EMAIL_VERIFICATION_REPOSITORY = Symbol('IEmailVerificationRepository');
