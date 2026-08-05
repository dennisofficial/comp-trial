import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';

export const OPENAPI_UI_PATH = 'api/docs';
export const OPENAPI_JSON_PATH = 'api/docs-json';

export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('comp-trial API')
    .setDescription(
      'The only backend. apps/web consumes this through a generated RTK Query client.',
    )
    .setVersion('1')
    .addTag('health')
    .addTag('pings')
    .build();

  return SwaggerModule.createDocument(app, config);
}
