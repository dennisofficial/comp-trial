import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '', {
  api_host: '/ingest',
  ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  capture_pageview: 'history_change',
  autocapture: true,
  defaults: '2025-05-24',
});

Sentry.init({
  enabled: process.env.NODE_ENV !== 'development',
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [Sentry.browserTracingIntegration(), Sentry.browserProfilingIntegration()],
  profileSessionSampleRate: 0.1,
  profileLifecycle: 'trace',
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
