import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Overwritten by `bun run openapi:codegen`; still typechecked, just not linted.
    'src/store/generated/**',
  ]),
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@repo/db',
              message:
                'apps/web talks to apps/api over HTTP. Add the endpoint there and regenerate the client with `bun run openapi:codegen`.',
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
