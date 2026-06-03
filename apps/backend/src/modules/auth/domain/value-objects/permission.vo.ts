/**
 * Permission Value Object
 *
 * Represents a single permission in the format "<resource>.<action>".
 * Examples: "users.read", "roles.write", "projects.delete"
 *
 * The format is intentionally flat (no nesting) to keep guard checks simple
 * and to match the format stored in the permissions table.
 */
export class PermissionVO {
  readonly resource: string;
  readonly action: string;

  private constructor(resource: string, action: string) {
    this.resource = resource;
    this.action = action;
  }

  static from(permission: string): PermissionVO {
    const parts = permission.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(
        `Invalid permission format: "${permission}". Expected "<resource>.<action>".`,
      );
    }
    return new PermissionVO(parts[0], parts[1]);
  }

  toString(): string {
    return `${this.resource}.${this.action}`;
  }

  equals(other: PermissionVO): boolean {
    return this.resource === other.resource && this.action === other.action;
  }
}
