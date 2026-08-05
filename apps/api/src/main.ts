// Must stay the first import: Sentry can only patch modules not yet required.
import './instrument';

import 'reflect-metadata';

import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { EnvService } from './config/env/env.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const env = app.get(EnvService);

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = env.get('CORS_ALLOWED_ORIGINS');
  const port = env.get('PORT');

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  new Logger('bootstrap').log(
    `listening on :${port} — CORS allows ${allowedOrigins.join(', ') || '(none)'}`,
  );
}

void bootstrap();
