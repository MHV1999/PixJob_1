import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionResolverService } from '../../application/services/permission-resolver.service';
import type { RequestUser } from '../strategies/jwt.strategy';

/**
 * PermissionsGuard
 *
 * FIX 5: Enforces fine-grained permission checks on routes decorated with
 * @RequirePermissions(...).
 *
 * Behaviour:
 * - If no permissions are declared on the route, the guard passes through.
 * - All declared permissions must be held by at least one of the user's roles
 *   (AND logic across permissions, OR logic across roles within each permission).
 * - Permissions are resolved via PermissionResolverService which uses a
 *   Redis-backed cache to avoid per-request DB queries.
 *
 * Guard execution order in AppModule:
 *   JwtAuthGuard → RolesGuard → PermissionsGuard
 *
 * Usage:
 *   @RequirePermissions('users.read')
 *   @Get('users')
 *   listUsers() { ... }
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No permission metadata — guard passes (use @Roles for coarse RBAC)
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: RequestUser }>();
    const user = request.user;

    if (!user?.roles?.length) {
      throw new ForbiddenException('Insufficient permissions');
    }

    const hasAll = await this.permissionResolver.hasAllPermissions(
      user.roles,
      requiredPermissions,
    );

    if (!hasAll) {
      this.logger.debug(
        `Permission denied for user ${user.id}. ` +
          `Required: [${requiredPermissions.join(', ')}]. ` +
          `Roles: [${user.roles.join(', ')}]`,
      );
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
