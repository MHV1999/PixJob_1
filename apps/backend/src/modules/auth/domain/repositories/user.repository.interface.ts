import { UserRole } from '@pixjob/shared-types';
import type { UserEntity } from '../entities/user.entity';

export interface CreateUserData {
  email: string;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roles?: UserRole[];
}

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByUsername(username: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  updateStatus(id: string, status: import('@pixjob/shared-types').UserStatus): Promise<UserEntity>;
  exists(email: string): Promise<boolean>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
