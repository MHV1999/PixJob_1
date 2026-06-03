import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Inject,
  Logger,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { UserStatus } from '@pixjob/shared-types';
import type { LoginDto } from '../dtos/login.dto';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';
import {
  ISessionRepository,
  SESSION_REPOSITORY,
} from '../../domain/repositories/session.repository.interface';
import { TokenService } from '../services/token.service';
import { AuditService } from '../services/audit.service';
import { AuditAction } from '../services/audit.constants';
import type { AuthTokens, UserSummary } from '@pixjob/shared-types';

// Argon2id parameters — kept consistent across the codebase
const ARGON2_OPTIONS: argon2.Options & { raw?: false } = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

@Injectable()
export class LoginUseCase {
  private readonly logger = new Logger(LoginUseCase.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepo: ISessionRepository,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    dto: LoginDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ tokens: AuthTokens; user: UserSummary }> {
    const isEmail = dto.identifier.includes('@');
    const user = isEmail
      ? await this.userRepo.findByEmail(dto.identifier)
      : await this.userRepo.findByUsername(dto.identifier);

    // ── FIX 3: User status enforcement ────────────────────────────────────────
    // DELETED users receive the same generic error as "not found" to prevent
    // account enumeration attacks.
    if (!user || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('Account has been banned');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    // PENDING users may not login until they verify their email.
    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException('Please verify your email address before logging in');
    }

    // Only ACTIVE users pass beyond this point.

    const passwordValid = await argon2.verify(user.password, dto.password);
    if (!passwordValid) {
      // Audit failed attempt without throwing — always fire and forget audit
      this.auditService.logSafe({
        userId: user.id,
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        entityId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.tokenService.generateTokens(user.id, user.email, user.roles);

    // ── FIX 1: Store ONLY the argon2id hash of the refresh token ──────────────
    // The raw token is issued to the client and NEVER persisted.
    // A database compromise will not reveal any valid refresh tokens.
    const hashedRefresh = await argon2.hash(tokens.refreshToken, ARGON2_OPTIONS);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7d

    await this.sessionRepo.create({
      userId: user.id,
      refreshToken: hashedRefresh,  // hashed — never plain text
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    });

    this.auditService.logSafe({
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        roles: user.roles,
      },
    };
  }
}
