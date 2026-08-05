import * as Sentry from '@sentry/nextjs';
import posthog from 'posthog-js';

// Next 16 executes this file on the client before hydration, which is the earliest hook
// available and what PostHog wants. On Next < 15.3 it is never called at all: the build
// passes, nothing throws, and no event ever fires.
//
// `api_host` points at the Next rewrite in next.config.ts, not at PostHog directly —
// adblockers block requests to *.posthog.com by hostname, and a first-party path is not
// something they can match on. `ui_host` still names the real origin so the toolbar and
// the "view in PostHog" links resolve.
posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '', {
  api_host: '/ingest',
  ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,

  // The App Router does not fire a browser navigation between routes, so history-based
  // autocapture misses everything after the first paint. `capture_pageview` handles it
  // natively as of posthog-js 1.170 — no manual usePathname effect.
  capture_pageview: 'history_change',

  // The SDK is a no-op without a key, so a checkout with no token still runs. Guarding
  // the init call instead would mean every later `posthog.capture` needs its own guard.
  autocapture: true,
  defaults: '2025-05-24',
});

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Order matters — profiling after tracing, or profileSessionSampleRate is ignored.
  integrations: [Sentry.browserTracingIntegration(), Sentry.browserProfilingIntegration()],

  // Chromium only, and needs the Document-Policy header from next.config.ts. Silently
  // no-ops everywhere else, so this data is Chrome-biased by construction.
  profileSessionSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  profileLifecycle: 'trace',
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
