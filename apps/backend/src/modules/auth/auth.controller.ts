import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Throttle } from '@nestjs/throttler';

import { RegisterDto } from './application/dtos/register.dto';
import { LoginDto } from './application/dtos/login.dto';
import { VerifyEmailDto } from './application/dtos/verify-email.dto';
import { AuthResponseDto, UserResponseDto } from './application/dtos/auth-response.dto';
import { RegisterUseCase } from './application/use-cases/register.use-case';
import { LoginUseCase } from './application/use-cases/login.use-case';
import { RefreshUseCase } from './application/use-cases/refresh.use-case';
import { LogoutUseCase } from './application/use-cases/logout.use-case';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.use-case';
import { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
import { Public } from './infrastructure/decorators/public.decorator';
import { CurrentUser } from './infrastructure/decorators/current-user.decorator';
import type { RequestUser } from './infrastructure/strategies/jwt.strategy';

const REFRESH_COOKIE = 'pixjob_refresh';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env['NODE_ENV'] === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
  ) {}

  // ─── POST /auth/register ────────────────────────────────────────────────────
  @Public()
  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, description: 'User created. Verification email sent.' })
  @ApiResponse({ status: 409, description: 'Email or username already taken' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ message: string; userId: string }> {
    const { user, verificationToken } = await this.registerUseCase.execute(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // In production this token would be emailed. For development, return it.
    if (process.env['NODE_ENV'] !== 'production') {
      void res.header('X-Dev-Verification-Token', user.id + verificationToken);
    }

    return { message: 'Registration successful. Please verify your email.', userId: user.id };
  }

  // ─── POST /auth/login ───────────────────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email/username and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AuthResponseDto> {
    const { tokens, user } = await this.loginUseCase.execute(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    void res.setCookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: this.toUserResponse(user),
    };
  }

  // ─── POST /auth/refresh ──────────────────────────────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  @ApiCookieAuth()
  @ApiResponse({ status: 200, description: 'New token pair returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const tokenFromCookie = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
    const rawToken = tokenFromCookie ?? (req.body as { refreshToken?: string })?.refreshToken;

    if (!rawToken) {
      throw new (await import('@nestjs/common')).UnauthorizedException('No refresh token provided');
    }

    const tokens = await this.refreshUseCase.execute(rawToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    void res.setCookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  // ─── POST /auth/logout ───────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke current session' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<void> {
    const tokenFromCookie = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
    const rawToken = tokenFromCookie ?? (req.body as { refreshToken?: string })?.refreshToken ?? '';

    await this.logoutUseCase.execute(rawToken, user.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    void res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  }

  // ─── POST /auth/verify-email ─────────────────────────────────────────────────
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: FastifyRequest,
  ): Promise<{ message: string }> {
    await this.verifyEmailUseCase.execute(dto.token, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return { message: 'Email verified successfully' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  private toUserResponse(user: {
    id: string;
    email: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    status: import('@pixjob/shared-types').UserStatus;
    roles: import('@pixjob/shared-types').UserRole[];
    createdAt?: Date;
  }): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.username = user.username;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.status = user.status;
    dto.roles = user.roles;
    dto.createdAt = user.createdAt ?? new Date();
    return dto;
  }
}
