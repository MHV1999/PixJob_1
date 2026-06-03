import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { appConfig } from './config/app.config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { JwtAuthGuard } from './modules/auth/infrastructure/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/infrastructure/guards/roles.guard';
import { PermissionsGuard } from './modules/auth/infrastructure/guards/permissions.guard';

@Module({
  imports: [
    // ── Configuration ─────────────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Rate limiting (global) ────────────────────────────────────────────────
    ThrottlerModule.forRoot([
      { name: 'short',  ttl: 1000,   limit: 10  },
      { name: 'medium', ttl: 10000,  limit: 50  },
      { name: 'long',   ttl: 60000,  limit: 200 },
    ]),

    // ── Infrastructure ────────────────────────────────────────────────────────
    DatabaseModule,
    RedisModule,

    // ── Feature modules ───────────────────────────────────────────────────────
    HealthModule,
    AuthModule,
    UsersModule,
  ],
  providers: [
    // Global guard execution order: JwtAuthGuard → RolesGuard → PermissionsGuard
    //
    // JwtAuthGuard:    validates JWT signature + live user status (FIX 3)
    // RolesGuard:      coarse role-based access control via @Roles(...)
    // PermissionsGuard: fine-grained permission checks via @RequirePermissions(...) (FIX 5)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
