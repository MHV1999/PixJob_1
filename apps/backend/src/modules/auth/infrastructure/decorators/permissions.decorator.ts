import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * @RequirePermissions decorator
 *
 * FIX 5: Declare the permissions required to access a route.
 * Works in conjunction with PermissionsGuard.
 *
 * Permission format: "<resource>.<action>"
 *
 * @example
 * // Require ALL listed permissions (AND logic)
 * @RequirePermissions('users.read', 'users.write')
 *
 * @example
 * // Single permission
 * @RequirePermissions('roles.read')
 */
export const RequirePermissions = (
  ...permissions: string[]
): ReturnType<typeof SetMetadata> => SetMetadata(PERMISSIONS_KEY, permissions);
