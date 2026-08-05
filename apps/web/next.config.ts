import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['@sentry/profiling-node'],
  skipTrailingSlashRedirect: true,

  // First-party reverse proxy for PostHog ingest. Requests to *.posthog.com are blocked
  // by hostname by most adblockers, which silently costs a double-digit share of events;
  // /ingest is not something a filter list can match. `skipTrailingSlashRedirect` keeps
  // the 308 on /ingest/decide from dropping the POST body.
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ];
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [{ key: 'Document-Policy', value: 'js-profiling' }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: 'comp-ai-trial',
  project: 'javascript-nextjs',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
});
