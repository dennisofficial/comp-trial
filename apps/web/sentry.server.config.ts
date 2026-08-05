import * as Sentry from '@sentry/nextjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  includeLocalVariables: true,
  integrations: [nodeProfilingIntegration()],
  profileSessionSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  profileLifecycle: 'trace',
});
