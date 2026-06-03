/**
 * Public API of the Auth module.
 * Other modules import from here instead of drilling into subdirectories.
 */

// Decorators
export { Public, IS_PUBLIC_KEY } from './infrastructure/decorators/public.decorator';
export { Roles, ROLES_KEY } from './infrastructure/decorators/roles.decorator';
export { RequirePermissions, PERMISSIONS_KEY } from './infrastructure/decorators/permissions.decorator';
export { CurrentUser } from './infrastructure/decorators/current-user.decorator';

// Guards
export { JwtAuthGuard } from './infrastructure/guards/jwt-auth.guard';
export { RolesGuard } from './infrastructure/guards/roles.guard';
export { PermissionsGuard } from './infrastructure/guards/permissions.guard';

// Strategy types
export type { RequestUser } from './infrastructure/strategies/jwt.strategy';

// Services (for use by other modules)
export { AuditService } from './application/services/audit.service';
export { AuditAction } from './application/services/audit.constants';
export type { AuditLogData } from './application/services/audit.service';
export { PermissionResolverService } from './application/services/permission-resolver.service';

// Repository tokens (for DI in other modules)
export { USER_REPOSITORY } from './domain/repositories/user.repository.interface';
export { SESSION_REPOSITORY } from './domain/repositories/session.repository.interface';
