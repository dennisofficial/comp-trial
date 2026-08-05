import 'reflect-metadata';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { NestFactory } from '@nestjs/core';

import { API_VERSIONING } from '../app.config';
import { AppModule } from '../app.module';
import { buildOpenApiDocument } from './document';

const SPEC_PATH = join(__dirname, '../../openapi.json');

async function generate(): Promise<void> {
  const app = await NestFactory.create(AppModule, { preview: true, logger: false });

  app.enableVersioning(API_VERSIONING);

  const document = buildOpenApiDocument(app);

  writeFileSync(SPEC_PATH, `${JSON.stringify(document, null, 2)}\n`);

  await app.close();

  console.log(`openapi.json written — ${Object.keys(document.paths).length} paths`);
}

void generate();
