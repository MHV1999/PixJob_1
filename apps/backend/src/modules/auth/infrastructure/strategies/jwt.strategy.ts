import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { UserRole, JwtPayload } from '@pixjob/shared-types';

export interface RequestUser {
  id: string;
  email: string;
  roles: UserRole[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('app.jwt.accessSecret');
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): RequestUser {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }
    return {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles ?? [],
    };
  }
}
