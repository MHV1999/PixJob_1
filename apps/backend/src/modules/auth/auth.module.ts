import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';

// Use-cases
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshUseCase } from './application/use-cases/refresh.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';

// Services
import { TokenService } from './application/services/token.service';
import { AuditService } from './application/services/audit.service';
import { PermissionResolverService } from './application/services/permission-resolver.service';

// Infrastructure — guards & strategy
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './infrastructure/guards/roles.guard';
import { PermissionsGuard } from './infrastructure/guards/permissions.guard';

// Infrastructure — repositories
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { PrismaSessionRepository } from './infrastructure/repositories/prisma-session.repository';
import { PrismaEmailVerificationRepository } from './infrastructure/repositories/prisma-email-verification.repository';

// Repository injection tokens
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { SESSION_REPOSITORY } from './domain/repositories/session.repository.interface';
import { EMAIL_VERIFICATION_REPOSITORY } from './domain/repositories/email-verification.repository.interface';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // secrets injected dynamically inside TokenService
  ],
  controllers: [AuthController],
  providers: [
    // ── Use-cases ────────────────────────────────────────────────────────────
    RegisterUseCase,
    LoginUseCase,
    RefreshUseCase,
    LogoutUseCase,
    VerifyEmailUseCase,

    // ── Application services ─────────────────────────────────────────────────
    TokenService,
    AuditService,
    PermissionResolverService, // FIX 5

    // ── Passport strategy ────────────────────────────────────────────────────
    JwtStrategy, // now injects USER_REPOSITORY for live status checks (FIX 3)

    // ── Guards (exported so AppModule can register them globally) ────────────
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard, // FIX 5

    // ── Repository bindings ──────────────────────────────────────────────────
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: EMAIL_VERIFICATION_REPOSITORY, useClass: PrismaEmailVerificationRepository },
  ],
  exports: [
    // Exported so other modules (UsersModule, future modules) can use these
    TokenService,
    AuditService,
    PermissionResolverService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
  ],
})
export class AuthModule {}
