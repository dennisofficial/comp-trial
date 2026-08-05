// Runs before the Nest container exists, so process.env instead of EnvService.
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

const isDevelopment = process.env.NODE_ENV !== 'production';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  tracesSampleRate: isDevelopment ? 1.0 : 0.1,
  integrations: [nodeProfilingIntegration()],
  profileSessionSampleRate: isDevelopment ? 1.0 : 0.1,
  profileLifecycle: 'trace',
});
