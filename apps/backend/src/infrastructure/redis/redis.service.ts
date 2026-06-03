import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.client = new Redis({
      host: this.configService.get<string>('app.redis.host', 'localhost'),
      port: this.configService.get<number>('app.redis.port', 6379),
      password: this.configService.get<string | undefined>('app.redis.password'),
      db: this.configService.get<number>('app.redis.db', 0),
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    this.client.on('connect', () => this.logger.log('Redis connected'));
    this.client.on('error', (err: Error) => this.logger.error('Redis error', err.message));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }
}
