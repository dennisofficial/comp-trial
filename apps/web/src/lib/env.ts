import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

// Every key must appear in `runtimeEnv` as a literal `process.env.X` read — Next inlines
// `NEXT_PUBLIC_*` at build time by textual substitution, so a computed lookup resolves to
// nothing in the browser. t3-env enforces the pairing: a key in a bucket with no
// `runtimeEnv` entry is a type error.
export const env = createEnv({
  client: {
    NEXT_PUBLIC_API_URL: z.url(),
  },
  runtimeEnv: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  emptyStringAsUndefined: true,
});
