// Must stay the first import: Sentry can only patch modules not yet required.
import './instrument';

import 'reflect-metadata';

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';

import { API_VERSIONING, VALIDATION_PIPE_OPTIONS } from './app.config';
import { AppModule } from './app.module';
import { EnvService } from './config/env/env.service';
import { buildOpenApiDocument, OPENAPI_JSON_PATH, OPENAPI_UI_PATH } from './openapi/document';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const env = app.get(EnvService);

  app.enableVersioning(API_VERSIONING);

  app.useGlobalPipes(new ValidationPipe(VALIDATION_PIPE_OPTIONS));

  const allowedOrigins = env.get('CORS_ALLOWED_ORIGINS');
  const port = env.get('PORT');

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  SwaggerModule.setup(OPENAPI_UI_PATH, app, buildOpenApiDocument(app), {
    jsonDocumentUrl: OPENAPI_JSON_PATH,
  });

  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');

  new Logger('bootstrap').log(
    `listening on :${port} — CORS allows ${allowedOrigins.join(', ') || '(none)'}`,
  );
}

void bootstrap();
