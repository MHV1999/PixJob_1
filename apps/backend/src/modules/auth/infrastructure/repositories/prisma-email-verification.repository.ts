import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type {
  IEmailVerificationRepository,
  CreateEmailVerificationData,
} from '../../domain/repositories/email-verification.repository.interface';

type VerifRow = { id: string; userId: string; token: string; expiresAt: Date; usedAt: Date | null };

@Injectable()
export class PrismaEmailVerificationRepository implements IEmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEmailVerificationData): Promise<{ id: string }> {
    // Remove any existing unused tokens for this user
    await this.prisma.emailVerification.deleteMany({
      where: { userId: data.userId, usedAt: null },
    });

    return this.prisma.emailVerification.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
      },
      select: { id: true },
    });
  }

  async findByToken(hashedToken: string): Promise<VerifRow | null> {
    return this.prisma.emailVerification.findUnique({
      where: { token: hashedToken },
      select: { id: true, userId: true, token: true, expiresAt: true, usedAt: true },
    });
  }

  async findPendingForUser(userId: string): Promise<VerifRow[]> {
    return this.prisma.emailVerification.findMany({
      where: { userId, usedAt: null },
      select: { id: true, userId: true, token: true, expiresAt: true, usedAt: true },
    });
  }

  async markUsed(id: string): Promise<void> {
    await this.prisma.emailVerification.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  }

  async deleteExpiredForUser(userId: string): Promise<void> {
    await this.prisma.emailVerification.deleteMany({
      where: { userId, expiresAt: { lt: new Date() } },
    });
  }
}
