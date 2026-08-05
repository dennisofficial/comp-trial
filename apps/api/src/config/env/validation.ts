import { z } from 'zod';

export enum ENodeEnv {
  DEV = 'development',
  PROD = 'production',
  TEST = 'test',
}

export const envSchema = z.object({
  NODE_ENV: z.enum(ENodeEnv).default(ENodeEnv.DEV),

  PORT: z.coerce.number().int().positive().max(65535).default(4000),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

export type IEnvConfig = z.infer<typeof envSchema>;

export function validateEnv(source: Record<string, unknown>): IEnvConfig {
  const result = envSchema.safeParse(source);

  if (result.success) return result.data;

  const issues = result.error.issues
    .map((issue) => `  ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid API environment:\n${issues}`);
}
