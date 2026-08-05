import { Test } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';

import { EnvModule } from '../env.module';
import { EnvService } from '../env.service';

const buildEnv = async ({ validate }: { validate: boolean }) => {
  const moduleRef = await Test.createTestingModule({
    imports: [EnvModule.forRoot({ validate })],
  }).compile();

  return moduleRef.get(EnvService);
};

describe('EnvModule', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('exports EnvService so main.ts can resolve it off the app container', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';

    const env = await buildEnv({ validate: true });

    expect(env).toBeInstanceOf(EnvService);
    expect(env.get('DATABASE_URL')).toBe('postgresql://u:p@localhost:5432/db');
  });

  it('boots without a validated environment when the caller opts out', async () => {
    delete process.env.DATABASE_URL;

    await expect(buildEnv({ validate: false })).resolves.toBeInstanceOf(EnvService);
  });

  it('serves the validated value, not the raw process.env string', async () => {
    process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
    process.env.PORT = '3001';
    process.env.CORS_ALLOWED_ORIGINS = 'https://a.example.com, https://b.example.com';

    const env = await buildEnv({ validate: true });

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

    const env = await buildEnv({ validate: true });

    expect(env.get('PORT')).toBe(4000);
    expect(env.get('CORS_ALLOWED_ORIGINS')).toEqual([]);
  });

  it('refuses to compile when a required variable is missing', async () => {
    delete process.env.DATABASE_URL;

    await expect(buildEnv({ validate: true })).rejects.toThrow(/DATABASE_URL/);
  });
});
