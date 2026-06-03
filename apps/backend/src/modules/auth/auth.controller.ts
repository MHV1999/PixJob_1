import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiHeader,
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
import type { UserStatus, UserRole } from '@pixjob/shared-types';

const REFRESH_COOKIE = 'pixjob_refresh';

const COOKIE_OPTIONS = {
  httpOnly: true,
  // Secure flag: HTTPS-only in production/staging; relaxed in local development
  secure: process.env['NODE_ENV'] === 'production' || process.env['NODE_ENV'] === 'staging',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
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
  @ApiResponse({ status: 201, description: 'User created. Verification email will be sent.' })
  @ApiResponse({ status: 409, description: 'Email or username already taken' })
  @ApiHeader({
    name: 'X-Dev-Verification-Token',
    description:
      '[DEVELOPMENT ONLY] Full verification token (userId + OTP). ' +
      'Never present in staging or production environments.',
    required: false,
  })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ message: string; userId: string }> {
    const { user, verificationToken } = await this.registerUseCase.execute(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // ── FIX 2: Verification token exposure ──────────────────────────────────
    // Security: The raw verification token is ONLY returned in the response
    // header when NODE_ENV=development. In staging and production the token
    // is delivered exclusively via email (or an email service integration).
    //
    // This check uses an explicit allowlist rather than a "not production"
    // check, so that any unrecognised environment (e.g. "test", "staging")
    // defaults to the secure behaviour.
    const isDevelopment = process.env['NODE_ENV'] === 'development';

    if (isDevelopment) {
      // Token format: userId(36) + rawOtp(32) — matches VerifyEmailUseCase.execute()
      void res.header('X-Dev-Verification-Token', user.id + verificationToken);
    }
    // Production / staging: token is NOT included in any response field or header.
    // It must be delivered out-of-band (email). Logging the token server-side is
    // also forbidden to prevent it appearing in log aggregation systems.

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
  @ApiResponse({ status: 403, description: 'Account suspended, banned or pending verification' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<AuthResponseDto> {
    const { tokens, user } = await this.loginUseCase.execute(dto, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Refresh token is set as HttpOnly cookie AND returned in body.
    // Clients that cannot read cookies (mobile, Postman) use the body value.
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
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  @ApiResponse({ status: 200, description: 'New token pair issued' })
  @ApiResponse({ status: 401, description: 'Invalid, expired or already-used refresh token' })
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<{ accessToken: string; expiresIn: number }> {
    // Prefer HttpOnly cookie; fall back to JSON body for non-browser clients
    const tokenFromCookie = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
    const rawToken = tokenFromCookie ?? (req.body as { refreshToken?: string })?.refreshToken;

    if (!rawToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const tokens = await this.refreshUseCase.execute(rawToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Rotate the cookie with the new refresh token
    void res.setCookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  // ─── POST /auth/logout ───────────────────────────────────────────────────────
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke current session and clear refresh token cookie' })
  @ApiResponse({ status: 204, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() currentUser: RequestUser,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<void> {
    const tokenFromCookie = (req.cookies as Record<string, string>)?.[REFRESH_COOKIE];
    const rawToken =
      tokenFromCookie ?? (req.body as { refreshToken?: string })?.refreshToken ?? '';

    await this.logoutUseCase.execute(rawToken, currentUser.id, {
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
  @ApiOperation({ summary: 'Verify email address using the token sent by email' })
  @ApiResponse({ status: 200, description: 'Email verified. Account is now ACTIVE.' })
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
    status: UserStatus;
    roles: UserRole[];
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
