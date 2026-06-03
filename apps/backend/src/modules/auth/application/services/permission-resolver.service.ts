import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import type { UserRole } from '@pixjob/shared-types';

const CACHE_TTL_SECONDS = 300; // 5 minutes
const CACHE_KEY_PREFIX = 'pixjob:perms:role:';

/**
 * PermissionResolverService
 *
 * FIX 5: Resolves the set of permissions granted to a list of roles.
 *
 * Results are cached in Redis with a 5-minute TTL to avoid a DB round-trip
 * on every authenticated request. The cache is keyed by role name so that
 * permission changes propagate within the TTL window without requiring a
 * server restart.
 *
 * Usage:
 *   const perms = await resolver.getPermissionsForRoles(['ADMIN', 'FINANCE']);
 *   // returns: Set { 'users.read', 'users.write', 'roles.read', ... }
 */
@Injectable()
export class PermissionResolverService {
  private readonly logger = new Logger(PermissionResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getPermissionsForRoles(roles: UserRole[]): Promise<Set<string>> {
    const allPermissions = new Set<string>();

    await Promise.all(
      roles.map(async (role) => {
        const perms = await this.getPermissionsForRole(role);
        for (const p of perms) {
          allPermissions.add(p);
        }
      }),
    );

    return allPermissions;
  }

  async hasPermission(roles: UserRole[], permission: string): Promise<boolean> {
    const perms = await this.getPermissionsForRoles(roles);
    return perms.has(permission);
  }

  async hasAllPermissions(roles: UserRole[], permissions: string[]): Promise<boolean> {
    const perms = await this.getPermissionsForRoles(roles);
    return permissions.every((p) => perms.has(p));
  }

  async hasAnyPermission(roles: UserRole[], permissions: string[]): Promise<boolean> {
    const perms = await this.getPermissionsForRoles(roles);
    return permissions.some((p) => perms.has(p));
  }

  /** Invalidate cached permissions for a specific role (call after permission changes) */
  async invalidateCache(role: UserRole): Promise<void> {
    await this.redis.del(`${CACHE_KEY_PREFIX}${role}`);
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async getPermissionsForRole(role: UserRole): Promise<string[]> {
    const cacheKey = `${CACHE_KEY_PREFIX}${role}`;

    // Try cache first
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as string[];
      }
    } catch (err) {
      this.logger.warn(`Redis cache read failed for role ${role}`, err);
    }

    // Cache miss — query database
    const roleRecord = await this.prisma.role.findUnique({
      where: { name: role },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    if (!roleRecord) return [];

    // Format: "<action>.<subject>" e.g. "read.User" → we store as "users.read"
    // Align with the "<resource>.<action>" convention used by the decorator
    const permissions = roleRecord.permissions.map(
      (rp) => `${rp.permission.subject.toLowerCase()}.${rp.permission.action.toLowerCase()}`,
    );

    // Write to cache — failures are non-fatal
    try {
      await this.redis.set(cacheKey, JSON.stringify(permissions), CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Redis cache write failed for role ${role}`, err);
    }

    return permissions;
  }
}
