// Runs before the Nest container exists, so process.env instead of EnvService.
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Nest sets no NODE_ENV of its own; production gets it from the Dockerfile, so absence means local.
const isDevelopment = process.env.NODE_ENV !== 'production';

Sentry.init({
  enabled: !isDevelopment,
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
  tracesSampleRate: 0.1,
  integrations: [nodeProfilingIntegration()],
  profileSessionSampleRate: 0.1,
  profileLifecycle: 'trace',
});
