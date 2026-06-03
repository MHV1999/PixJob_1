import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@ApiTags('health')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check — database and Redis connectivity' })
  async check(): Promise<{
    status: string;
    timestamp: string;
    services: { database: string; redis: string };
  }> {
    let dbStatus = 'ok';
    let redisStatus = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    try {
      await this.redis.set('__health_check__', '1', 5);
    } catch {
      redisStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' && redisStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: { database: dbStatus, redis: redisStatus },
    };
  }
}
