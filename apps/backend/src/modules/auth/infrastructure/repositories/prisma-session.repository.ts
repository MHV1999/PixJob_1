import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { ISessionRepository, CreateSessionData } from '../../domain/repositories/session.repository.interface';

type SessionRow = {
  id: string;
  userId: string;
  refreshToken: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

@Injectable()
export class PrismaSessionRepository implements ISessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSessionData): Promise<{ id: string }> {
    return this.prisma.session.create({
      data: {
        userId: data.userId,
        refreshToken: data.refreshToken,
        userAgent: data.userAgent ?? null,
        ipAddress: data.ipAddress ?? null,
        expiresAt: data.expiresAt,
      },
      select: { id: true },
    });
  }

  async findByRefreshToken(
    hashedToken: string,
  ): Promise<SessionRow | null> {
    return this.prisma.session.findUnique({
      where: { refreshToken: hashedToken },
      select: { id: true, userId: true, refreshToken: true, expiresAt: true, revokedAt: true },
    });
  }

  async findActiveSessionsForUser(userId: string): Promise<SessionRow[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true, userId: true, refreshToken: true, expiresAt: true, revokedAt: true },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
