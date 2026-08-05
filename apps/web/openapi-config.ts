import type { ConfigFile } from '@rtk-query/codegen-openapi';

const config: ConfigFile = {
  schemaFile: '../api/openapi.json',
  apiFile: './src/store/base-api.ts',
  apiImport: 'baseApi',
  outputFile: './src/store/generated/api.ts',
  exportName: 'generatedApi',
  hooks: true,
  tag: true,
};

export default config;
