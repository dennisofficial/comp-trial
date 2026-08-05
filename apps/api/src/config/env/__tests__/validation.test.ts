import { describe, expect, it } from 'vitest';

import { validateEnv, type IEnvConfig } from '../validation';

const BASE = { DATABASE_URL: 'postgresql://u:p@localhost:5432/db' };

// Guardrails on the inferred `IEnvConfig`. These fail `tsc --noEmit`, not the test run.
type Expect<T extends true> = T;
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type _PortIsNumber = Expect<Equals<IEnvConfig['PORT'], number>>;
type _OriginsAreStringArray = Expect<Equals<IEnvConfig['CORS_ALLOWED_ORIGINS'], string[]>>;
type _DatabaseUrlIsString = Expect<Equals<IEnvConfig['DATABASE_URL'], string>>;

describe('validateEnv', () => {
  it('defaults PORT to the local 4000 when the platform does not set one', () => {
    expect(validateEnv({ ...BASE }).PORT).toBe(4000);
  });

  it('coerces PORT from the string the platform actually injects', () => {
    expect(validateEnv({ ...BASE, PORT: '3001' }).PORT).toBe(3001);
  });

  it('rejects a PORT outside the valid range instead of binding to it', () => {
    expect(() => validateEnv({ ...BASE, PORT: '70000' })).toThrow(/PORT/);
  });

  it('throws when DATABASE_URL is missing rather than booting half-configured', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('splits and trims the CORS allowlist into an array', () => {
    const env = validateEnv({
      ...BASE,
      CORS_ALLOWED_ORIGINS: 'https://a.example.com, https://b.example.com',
    });

    expect(env.CORS_ALLOWED_ORIGINS).toEqual(['https://a.example.com', 'https://b.example.com']);
  });

  it('yields an empty allowlist rather than [""] when unset', () => {
    expect(validateEnv({ ...BASE }).CORS_ALLOWED_ORIGINS).toEqual([]);
  });

  it('defaults NODE_ENV to development but keeps an explicit value', () => {
    expect(validateEnv({ ...BASE }).NODE_ENV).toBe('development');
    expect(validateEnv({ ...BASE, NODE_ENV: 'production' }).NODE_ENV).toBe('production');
  });

  it('rejects a NODE_ENV outside the known set', () => {
    expect(() => validateEnv({ ...BASE, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('reports every problem at once rather than one per restart', () => {
    expect(() => validateEnv({ PORT: 'not-a-port' })).toThrow(
      /DATABASE_URL[\s\S]*PORT|PORT[\s\S]*DATABASE_URL/,
    );
  });

  it('ignores unrelated platform variables', () => {
    expect(validateEnv({ ...BASE, VERCEL_ENV: 'preview' })).not.toHaveProperty('VERCEL_ENV');
  });
});
