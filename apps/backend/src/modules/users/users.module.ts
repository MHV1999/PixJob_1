import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { USER_REPOSITORY } from '../auth/domain/repositories/user.repository.interface';
import { PrismaUserRepository } from '../auth/infrastructure/repositories/prisma-user.repository';

@Module({
  controllers: [UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
})
export class UsersModule {}
