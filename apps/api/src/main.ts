/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix, {
    exclude: ['health', 'api/health', ''],
  });

  // Enable CORS for Vercel frontend and client requests
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
      if (
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin === frontendUrl
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Content-Type, Accept, Authorization, x-tenant-subdomain, x-tenant-slug, x-hub-signature-256',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix} (Health: http://localhost:${port}/health)`);
}

bootstrap();
