import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EnvModule } from '../env.module';
import { EnvService } from '../env.service';

const buildEnv = async () => {
  const moduleRef = await Test.createTestingModule({ imports: [EnvModule] }).compile();

  return moduleRef.get(EnvService);
};

// EnvModule reads NODE_ENV at import time, so the validated path needs a fresh import.
const buildValidatedEnv = async () => {
  vi.resetModules();
  process.env.NODE_ENV = 'development';

  const [{ EnvModule: FreshEnvModule }, { EnvService: FreshEnvService }] = await Promise.all([
    import('../env.module'),
    import('../env.service'),
  ]);

  const moduleRef = await Test.createTestingModule({ imports: [FreshEnvModule] }).compile();

  return moduleRef.get(FreshEnvService);
};

describe('EnvModule', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  it('exports EnvService so main.ts can resolve it off the app container', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';

    const env = await buildEnv();

    expect(env).toBeInstanceOf(EnvService);
    expect(env.get('DATABASE_URL')).toBe('postgresql://u:p@localhost:5432/db');
  });

  it('boots without a validated environment under NODE_ENV=test', async () => {
    delete process.env.DATABASE_URL;

    await expect(buildEnv()).resolves.toBeInstanceOf(EnvService);
  });

  it('serves the validated value, not the raw process.env string', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
    process.env.PORT = '3001';
    process.env.CORS_ALLOWED_ORIGINS = 'https://a.example.com, https://b.example.com';

    const env = await buildValidatedEnv();

    expect(env.get('PORT')).toBe(3001);
    expect(env.get('CORS_ALLOWED_ORIGINS')).toEqual([
      'https://a.example.com',
      'https://b.example.com',
    ]);
  });

  it('applies schema defaults for the keys the platform leaves unset', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
    delete process.env.PORT;
    delete process.env.CORS_ALLOWED_ORIGINS;

    const env = await buildValidatedEnv();

    expect(env.get('PORT')).toBe(8080);
    expect(env.get('CORS_ALLOWED_ORIGINS')).toEqual([]);
  });

  it('refuses to compile when a required variable is missing', async () => {
    delete process.env.DATABASE_URL;

    await expect(buildValidatedEnv()).rejects.toThrow(/DATABASE_URL/);
  });
});
