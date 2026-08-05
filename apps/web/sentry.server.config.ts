import * as Sentry from '@sentry/nextjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  enabled: process.env.NODE_ENV !== 'development',
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  includeLocalVariables: true,
  integrations: [nodeProfilingIntegration()],
  profileSessionSampleRate: 0.1,
  profileLifecycle: 'trace',
});
