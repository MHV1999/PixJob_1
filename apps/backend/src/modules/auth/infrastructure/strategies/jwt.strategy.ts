import { Injectable, UnauthorizedException, ForbiddenException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserStatus, type UserRole, type JwtPayload } from '@pixjob/shared-types';
import {
  IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface';

export interface RequestUser {
  id: string;
  email: string;
  roles: UserRole[];
  status: UserStatus;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    // FIX 3: Inject UserRepository to perform live status checks on every request
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {
    const secret = configService.get<string>('app.jwt.accessSecret');
    if (!secret) throw new Error('JWT_ACCESS_SECRET is not configured');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * FIX 3: User Status Enforcement
   *
   * This method is called on every authenticated request after the JWT
   * signature and expiry have been verified by passport-jwt.
   *
   * We perform a live database lookup to enforce the user's current status.
   * This closes the window where a suspended/banned user could continue using
   * a valid access token for up to 15 minutes after their account was restricted.
   *
   * Statuses and their response codes:
   *  - ACTIVE    → allowed (200)
   *  - PENDING   → 401 Unauthorized (email not verified)
   *  - SUSPENDED → 403 Forbidden
   *  - BANNED    → 403 Forbidden
   *  - DELETED   → 401 Unauthorized (same as "not found" to prevent enumeration)
   */
  async validate(payload: JwtPayload): Promise<RequestUser> {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const user = await this.userRepo.findById(payload.sub);

    if (!user || user.status === UserStatus.DELETED) {
      throw new UnauthorizedException('Authentication required');
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('Account has been banned');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException('Account is suspended');
    }

    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException('Email verification required');
    }

    // Only ACTIVE users reach this point
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      status: user.status,
    };
  }
}
