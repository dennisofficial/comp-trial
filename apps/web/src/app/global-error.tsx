'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

import './globals.css';

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          The error has been reported. Try again, and let us know if it keeps happening.
        </p>
        <button
          type="button"
          onClick={retry}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
