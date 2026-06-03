import { Injectable, ConflictException, Inject } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserRole } from '@pixjob/shared-types';
import type { RegisterDto } from '../dtos/register.dto';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import {
  IEmailVerificationRepository,
  EMAIL_VERIFICATION_REPOSITORY,
} from '../../domain/repositories/email-verification.repository.interface';
import { TokenService } from '../services/token.service';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '../services/audit.constants';
import type { UserEntity } from '../../domain/entities/user.entity';

// Argon2id parameters — kept consistent across the codebase
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(EMAIL_VERIFICATION_REPOSITORY)
    private readonly emailVerifRepo: IEmailVerificationRepository,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    dto: RegisterDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ user: UserEntity; verificationToken: string }> {
    const emailExists = await this.userRepo.exists(dto.email);
    if (emailExists) {
      throw new ConflictException('Email already registered');
    }

    const byUsername = await this.userRepo.findByUsername(dto.username);
    if (byUsername) {
      throw new ConflictException('Username already taken');
    }

    const hashedPassword = await argon2.hash(dto.password, ARGON2_OPTIONS);

    const user = await this.userRepo.create({
      email: dto.email,
      username: dto.username,
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      roles: [UserRole.CLIENT],
    });

    // Generate a random 32-byte hex token (64 chars).
    // The raw token is returned to the caller so it can be delivered via email.
    // Only the argon2id hash is stored in the database (FIX 1 principle).
    const rawToken = this.tokenService.generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    const hashedToken = await argon2.hash(rawToken, ARGON2_OPTIONS);

    await this.emailVerifRepo.create({ userId: user.id, token: hashedToken, expiresAt });

    // FIX 4: Use logSafe — registration must succeed even if audit write fails
    this.auditService.logSafe({
      userId: user.id,
      action: AuditAction.REGISTER,
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { email: user.email },
    });

    return { user, verificationToken: rawToken };
  }
}
