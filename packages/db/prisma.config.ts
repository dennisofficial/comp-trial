import { defineConfig } from 'prisma/config';

const migrationUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema',
  ...(migrationUrl ? { datasource: { url: migrationUrl } } : {}),
  migrations: {
    path: 'prisma/migrations',
  },
});
