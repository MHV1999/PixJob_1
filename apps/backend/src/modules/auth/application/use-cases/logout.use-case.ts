import { Injectable, Inject, Logger } from '@nestjs/common';
import * as argon2 from 'argon2';
import {
  ISessionRepository,
  SESSION_REPOSITORY,
} from '../../domain/repositories/session.repository.interface';
import { TokenService } from '../services/token.service';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '../services/audit.constants';

@Injectable()
export class LogoutUseCase {
  private readonly logger = new Logger(LogoutUseCase.name);

  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepo: ISessionRepository,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    rawRefreshToken: string,
    userId: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    // ── FIX 1: Invalidate the stored hash for this specific refresh token ──
    // We decode (without verifying) to confirm the token belongs to this user,
    // then iterate active sessions and use argon2.verify to find the match.
    // Failures here must NEVER prevent logout from completing.

    if (rawRefreshToken) {
      const payload = this.tokenService.decodeRefreshToken(rawRefreshToken);

      // Only attempt session revocation if the token claims to belong to this user
      if (payload?.sub === userId) {
        try {
          const sessions = await this.sessionRepo.findActiveSessionsForUser(userId);

          for (const session of sessions) {
            try {
              // FIX 1: verify against stored argon2id hash
              const matches = await argon2.verify(session.refreshToken, rawRefreshToken);
              if (matches) {
                await this.sessionRepo.revoke(session.id);
                break;
              }
            } catch {
              // malformed hash — skip
            }
          }
        } catch (err) {
          // Audit failure must not block logout (FIX 4 principle)
          this.logger.warn('Session revocation failed during logout', err);
        }
      }
    }

    // Audit is fire-and-forget — logout succeeds even if audit write fails
    this.auditService.logSafe({
      userId,
      action: AuditAction.LOGOUT,
      entityType: 'User',
      entityId: userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}
