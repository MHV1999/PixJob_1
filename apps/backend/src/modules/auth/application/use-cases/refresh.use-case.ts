import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserStatus } from '@pixjob/shared-types';
import {
  ISessionRepository,
  SESSION_REPOSITORY,
} from '../../domain/repositories/session.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { TokenService } from '../services/token.service';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '../services/audit.constants';
import type { AuthTokens } from '@pixjob/shared-types';

// Argon2id parameters — must match the parameters used at hash time
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

@Injectable()
export class RefreshUseCase {
  private readonly logger = new Logger(RefreshUseCase.name);

  constructor(
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepo: ISessionRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    rawRefreshToken: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<AuthTokens> {
    // ── Step 1: Verify the JWT signature first ──────────────────────────────
    // This rejects tampered or expired tokens before any DB lookup.
    let userId: string;
    try {
      const payload = await this.tokenService.verifyRefreshToken(rawRefreshToken);
      userId = payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // ── Step 2: Load all active sessions for this user ──────────────────────
    // We iterate and use argon2.verify because tokens are stored as hashes.
    // This is intentional: the DB stores only hashed tokens (FIX 1).
    const sessions = await this.sessionRepo.findActiveSessionsForUser(userId);

    let matchedSession: { id: string; userId: string; expiresAt: Date; revokedAt: Date | null } | null = null;

    for (const session of sessions) {
      try {
        const matches = await argon2.verify(session.refreshToken, rawRefreshToken);
        if (matches) {
          matchedSession = session;
          break;
        }
      } catch {
        // argon2 throws on malformed hash strings — skip and continue
      }
    }

    // ── Step 3: Handle token reuse detection ───────────────────────────────
    // If the JWT is valid but no active session matches, this indicates:
    // (a) the token was already rotated (legitimate client retry), or
    // (b) a stolen token being replayed by an attacker.
    // In both cases we revoke ALL sessions for this user as a security measure.
    if (!matchedSession) {
      this.logger.warn(`Possible refresh token reuse detected for user ${userId}`);
      await this.sessionRepo.revokeAllForUser(userId);
      this.auditService.logSafe({
        userId,
        action: AuditAction.TOKEN_REUSE_DETECTED,
        entityType: 'Session',
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'no_matching_session' },
      });
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (matchedSession.revokedAt || matchedSession.expiresAt < new Date()) {
      // Token was already revoked or expired — treat as reuse attempt
      await this.sessionRepo.revokeAllForUser(userId);
      throw new UnauthorizedException('Refresh token already used or expired. Please login again.');
    }

    // ── Step 4: Enforce user status (FIX 3) ────────────────────────────────
    // Even if the token is valid, a suspended/banned user must be blocked.
    const user = await this.userRepo.findById(matchedSession.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive()) {
      await this.sessionRepo.revokeAllForUser(user.id);
      throw new ForbiddenException(`Account access denied: status is ${user.status}`);
    }

    // ── Step 5: Rotate — revoke old, issue new ──────────────────────────────
    // Old session is revoked first to prevent double-use during rotation.
    await this.sessionRepo.revoke(matchedSession.id);

    const newTokens = await this.tokenService.generateTokens(user.id, user.email, user.roles);

    // FIX 1: Store ONLY the hash of the new refresh token
    const hashedRefresh = await argon2.hash(newTokens.refreshToken, ARGON2_OPTIONS);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.sessionRepo.create({
      userId: user.id,
      refreshToken: hashedRefresh,  // hashed — never plain text
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    });

    this.auditService.logSafe({
      userId: user.id,
      action: AuditAction.TOKEN_REFRESHED,
      entityType: 'Session',
      entityId: matchedSession.id,
      ipAddress: meta.ipAddress,
    });

    return newTokens;
  }
}
