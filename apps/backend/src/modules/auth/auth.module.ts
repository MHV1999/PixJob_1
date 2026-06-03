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

// Infrastructure
import { JwtStrategy } from './infrastructure/strategies/jwt.strategy';
import { PrismaUserRepository } from './infrastructure/repositories/prisma-user.repository';
import { PrismaSessionRepository } from './infrastructure/repositories/prisma-session.repository';
import { PrismaEmailVerificationRepository } from './infrastructure/repositories/prisma-email-verification.repository';

// Repository tokens
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
import { SESSION_REPOSITORY } from './domain/repositories/session.repository.interface';
import { EMAIL_VERIFICATION_REPOSITORY } from './domain/repositories/email-verification.repository.interface';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}), // secrets provided dynamically in TokenService
  ],
  controllers: [AuthController],
  providers: [
    // Use-cases
    RegisterUseCase,
    LoginUseCase,
    RefreshUseCase,
    LogoutUseCase,
    VerifyEmailUseCase,

    // Services
    TokenService,
    AuditService,

    // Strategy
    JwtStrategy,

    // Repository bindings
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: SESSION_REPOSITORY, useClass: PrismaSessionRepository },
    { provide: EMAIL_VERIFICATION_REPOSITORY, useClass: PrismaEmailVerificationRepository },
  ],
  exports: [
    TokenService,
    JwtStrategy,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
})
export class AuthModule {}
