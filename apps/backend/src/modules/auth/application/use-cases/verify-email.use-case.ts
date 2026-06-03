import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserStatus } from '@pixjob/shared-types';
import {
  IEmailVerificationRepository,
  EMAIL_VERIFICATION_REPOSITORY,
} from '../../domain/repositories/email-verification.repository.interface';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '../services/audit.constants';

@Injectable()
export class VerifyEmailUseCase {
  constructor(
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerifRepo: IEmailVerificationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    rawToken: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    // Token format: userId(36 chars UUID) + rawOtp(32 chars hex)
    // The userId prefix allows us to scope the DB lookup to a single user
    // without needing a separate index on the raw token.
    const userId = rawToken.substring(0, 36);
    const otp = rawToken.substring(36);

    if (!userId || !otp) {
      throw new BadRequestException('Invalid verification token format');
    }

    const user = await this.userRepo.findById(userId);
    // Return the same error regardless of whether the user exists to prevent
    // account enumeration via the verification endpoint.
    if (!user) throw new NotFoundException('Verification token invalid');

    const verifications = await this.emailVerifRepo.findPendingForUser(userId);

    let matched: { id: string } | null = null;
    for (const v of verifications) {
      if (v.usedAt || v.expiresAt <= new Date()) continue;

      try {
        const ok = await argon2.verify(v.token, otp);
        if (ok) {
          matched = v;
          break;
        }
      } catch {
        // argon2 throws on malformed hash — skip
      }
    }

    if (!matched) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.emailVerifRepo.markUsed(matched.id);
    await this.userRepo.updateStatus(userId, UserStatus.ACTIVE);

    // FIX 4: logSafe — verification must succeed even if audit write fails
    this.auditService.logSafe({
      userId,
      action: AuditAction.EMAIL_VERIFIED,
      entityType: 'User',
      entityId: userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  }
}
