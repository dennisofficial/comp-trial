import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { generateEndpoints, parseConfig } from '@rtk-query/codegen-openapi';

import config from '../openapi-config';

// The bundled CLI shells out to ts-node or esbuild-runner to read a TypeScript config.
// Bun already runs TypeScript, so calling the same two functions the CLI calls keeps the
// typed config without a transpiler dependency. Paths in the config are relative to
// apps/web, which is where package.json runs this from.
for (const parsed of parseConfig(config)) {
  // generateEndpoints writes but does not create the directory.
  if (parsed.outputFile) mkdirSync(dirname(parsed.outputFile), { recursive: true });

  await generateEndpoints(parsed);

  console.log(`generated ${parsed.outputFile}`);
}
