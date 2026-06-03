import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@pixjob/shared-types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RequestUser } from '../strategies/jwt.strategy';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const { user } = request;

    const hasRole = requiredRoles.some((role) => user?.roles?.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
