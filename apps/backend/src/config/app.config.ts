import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  port: parseInt(process.env['PORT'] ?? '4000', 10),
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',

  database: {
    url: process.env['DATABASE_URL'] ?? '',
  },

  redis: {
    host: process.env['REDIS_HOST'] ?? 'localhost',
    port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
    password: process.env['REDIS_PASSWORD'] ?? undefined,
    db: parseInt(process.env['REDIS_DB'] ?? '0', 10),
  },

  jwt: {
    accessSecret: process.env['JWT_ACCESS_SECRET'] ?? '',
    refreshSecret: process.env['JWT_REFRESH_SECRET'] ?? '',
    accessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
    refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  },
}));
