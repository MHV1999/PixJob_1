import { Injectable } from '@nestjs/common';
import { UserRole, UserStatus } from '@pixjob/shared-types';
import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import type { IUserRepository, CreateUserData } from '../../domain/repositories/user.repository.interface';
import { UserEntity } from '../../domain/entities/user.entity';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({
      where: { email },
      include: { userRoles: { include: { role: true } } },
    });
    return row ? this.toEntity(row) : null;
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    const row = await this.prisma.user.findUnique({
      where: { username },
      include: { userRoles: { include: { role: true } } },
    });
    return row ? this.toEntity(row) : null;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    const rolesToAssign = data.roles ?? [UserRole.CLIENT];

    // Ensure roles exist (seed-safe upsert)
    const roleRecords = await Promise.all(
      rolesToAssign.map((name) =>
        this.prisma.role.upsert({
          where: { name },
          create: { name },
          update: {},
        }),
      ),
    );

    const row = await this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        password: data.password,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        userRoles: {
          create: roleRecords.map((r) => ({ roleId: r.id })),
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    return this.toEntity(row);
  }

  async updateStatus(id: string, status: UserStatus): Promise<UserEntity> {
    const row = await this.prisma.user.update({
      where: { id },
      data: { status },
      include: { userRoles: { include: { role: true } } },
    });
    return this.toEntity(row);
  }

  async exists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { email } });
    return count > 0;
  }

  private toEntity(row: {
    id: string;
    email: string;
    username: string;
    password: string;
    firstName: string | null;
    lastName: string | null;
    status: UserStatus;
    createdAt: Date;
    updatedAt: Date;
    userRoles: { role: { name: UserRole } }[];
  }): UserEntity {
    return new UserEntity({
      id: row.id,
      email: row.email,
      username: row.username,
      password: row.password,
      firstName: row.firstName,
      lastName: row.lastName,
      status: row.status,
      roles: row.userRoles.map((ur) => ur.role.name),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
