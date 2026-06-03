import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import type { UserRole, AuthTokens, JwtPayload } from '@pixjob/shared-types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateTokens(
    userId: string,
    email: string,
    roles: UserRole[],
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, roles };

    const accessSecret = this.configService.get<string>('app.jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('app.jwt.refreshSecret');
    const accessExpiresIn = this.configService.get<string>('app.jwt.accessExpiresIn', '15m');
    const refreshExpiresIn = this.configService.get<string>('app.jwt.refreshExpiresIn', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: accessSecret, expiresIn: accessExpiresIn }),
      this.jwtService.signAsync(payload, { secret: refreshSecret, expiresIn: refreshExpiresIn }),
    ]);

    return { accessToken, refreshToken, expiresIn: this.parseExpiresIn(accessExpiresIn) };
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    const secret = this.configService.get<string>('app.jwt.accessSecret');
    return this.jwtService.verifyAsync<JwtPayload>(token, { secret });
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    const secret = this.configService.get<string>('app.jwt.refreshSecret');
    return this.jwtService.verifyAsync<JwtPayload>(token, { secret });
  }

  decodeRefreshToken(token: string): JwtPayload | null {
    try {
      return this.jwtService.decode<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  /** Generates a raw verification token: userId(36) + randomHex(32) */
  generateVerificationToken(): string {
    return randomBytes(16).toString('hex');
  }

  private parseExpiresIn(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return 900;
    const n = parseInt(match[1], 10);
    switch (match[2]) {
      case 's': return n;
      case 'm': return n * 60;
      case 'h': return n * 3600;
      case 'd': return n * 86400;
      default:  return 900;
    }
  }
}
