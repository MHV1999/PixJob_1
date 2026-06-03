import { UserRole, UserStatus } from '@pixjob/shared-types';

export class UserEntity {
  readonly id: string;
  readonly email: string;
  readonly username: string;
  readonly password: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly status: UserStatus;
  readonly roles: UserRole[];
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: {
    id: string;
    email: string;
    username: string;
    password: string;
    firstName: string | null;
    lastName: string | null;
    status: UserStatus;
    roles: UserRole[];
    createdAt: Date;
    updatedAt: Date;
  }) {
    Object.assign(this, props);
    this.id = props.id;
    this.email = props.email;
    this.username = props.username;
    this.password = props.password;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.status = props.status;
    this.roles = props.roles;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  fullName(): string {
    return [this.firstName, this.lastName].filter(Boolean).join(' ');
  }
}
