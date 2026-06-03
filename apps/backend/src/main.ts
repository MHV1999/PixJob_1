import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import fastifyCookie from '@fastify/cookie';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: process.env['NODE_ENV'] !== 'production' }),
  );

  const config = app.get(ConfigService);

  // Cookie support (for HttpOnly refresh token)
  await app.register(fastifyCookie, {
    secret: config.get<string>('app.jwt.accessSecret', 'cookie_secret'),
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // URI Versioning: /api/v1/...
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS
  app.enableCors({
    origin: config.get<string>('FRONTEND_URL', 'http://localhost:3000'),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // Swagger (dev only)
  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('PixJob API')
      .setDescription('PixJob marketplace REST API — Sprint 1: Authentication & Identity')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('pixjob_refresh')
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 4000);
  await app.listen(port, '0.0.0.0');
  console.warn(`PixJob API running on http://localhost:${String(port)}`);
  console.warn(`Swagger docs: http://localhost:${String(port)}/api/docs`);
}

void bootstrap();
