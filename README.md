# comp-trial

Full-stack app for the Comp AI work trial. Turborepo · Bun · Next.js 16 · Prisma 7 · Postgres (Neon)
· deployed on Vercel.

**Live:** https://comp-trial.dennislysenko.com · health check:
[`/api/health`](https://comp-trial.dennislysenko.com/api/health) (503 if Postgres is unreachable, so
a green deploy means a green database)

Design decisions and the gaps I found in the spec live in [`DECISIONS.md`](./DECISIONS.md). That's
the document to read second.

## Layout

```
apps/web/          Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui
                   (each package owns its own dotenvx-encrypted .env.local.enc)
  src/app/         routes + route handlers
  src/components/  UI
  src/server/
    services/      business logic — no transport concerns
    validators/    Zod schemas shared by forms and routes
packages/db/       Prisma schema + client singleton
infra/terraform/   Cloudflare DNS + Vercel domain (see terraform-readme.md)
```

## Setup

Requires Bun 1.3.4 (`mise install`).

```bash
bun install
cd packages/db && bun run db:deploy && cd ../..
bun run dev
```

## Environment

Secrets are [dotenvx](https://dotenvx.com)-encrypted and **committed**. Each package owns its own
`.env.local.enc`: values are ciphertext, key names stay readable in a diff, and the private key
lives in a git-ignored `.env.keys` beside it. `.env.personal` is an optional plaintext local
override that layers on top. There is no plaintext `.env` anywhere.

| File                   | Committed | Holds                                |
| ---------------------- | --------- | ------------------------------------ |
| `<pkg>/.env.local.enc` | yes       | encrypted local-dev values           |
| `<pkg>/.env.keys`      | no        | the private key that decrypts them   |
| `<pkg>/.env.personal`  | no        | plaintext local overrides (optional) |
| `.env.example`         | yes       | keyless reference for every variable |

Scripts that need secrets go through each package's `env:inject`, which decrypts into the
environment for the duration of one command. Scripts that run where the platform already supplies
the variables — `build`, `start` (api), `db:deploy` — stay outside dotenvx on purpose, so a
deploy never depends on a private key being present. To build the web app locally with the
encrypted values, use `build:local`.

Adding a variable means touching the package's `.env.local.enc` (insert the key manually at the
right line, then `dotenvx set`), `.env.example`, and the package's schema — the Zod `envSchema` in
`apps/api/src/config/env/validation.ts` for the API, the `createEnv` call in
`apps/web/src/lib/env.ts` for the web app. Same line, same variable. The API's `IEnvConfig` type is
inferred from that schema and the web app's `env` object from its buckets, so there is nothing to
keep in sync by hand.

## Commands

| Command                                              | What it does                                        |
| ---------------------------------------------------- | --------------------------------------------------- |
| `bun run dev`                                        | All apps in watch mode, env decrypted               |
| `bun run build`                                      | Turbo build (runs `db:generate` first)              |
| `bun run typecheck`                                  | `tsc --noEmit` across the workspace                 |
| `bun run test`                                       | Vitest                                              |
| `bun run env:check`                                  | Fail if a plaintext secret is about to be committed |
| `cd packages/db && bun run db:migrate --name <name>` | New migration                                       |
| `cd packages/db && bun run db:studio`                | Prisma Studio                                       |

## Testing

Vitest, focused on the code where a bug is silent: the Zod validators shared between form and API,
and the service layer. UI rendering is checked by looking at it; input validation is not, so that's
where the tests are.

## Deployment

Vercel project `comp-trial`, root directory `apps/web`:

| Setting | Value                                    |
| ------- | ---------------------------------------- |
| Install | `cd ../.. && bun install`                |
| Build   | `cd ../.. && bun run build --filter=web` |

`build` runs outside dotenvx on purpose, so everything it needs lives in the Vercel project rather
than in a `.enc` file:

| Variable                                | Prod | Preview | Dev | Why                                                                                                         |
| --------------------------------------- | :--: | :-----: | :-: | ----------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                          |  ✓   |    ✓    |  ✓  | Prisma at runtime                                                                                           |
| `DIRECT_URL`                            |  ✓   |    ✓    |  —  | migrations only                                                                                             |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` |  ✓   |    ✓    |  —  | server+edge / browser — both are needed, they differ                                                        |
| `SENTRY_AUTH_TOKEN`                     |  ✓   |    ✓    |  —  | build-time source map upload                                                                                |
| `NEXT_PUBLIC_POSTHOG_KEY` / `..._HOST`  |  ✓   |    —    |  —  | production only, so preview clicks stay out of funnels                                                      |
| `NEXT_PUBLIC_API_URL`                   |  ✓   |    —    |  —  | `https://comp-api.dennislysenko.com` — must appear verbatim in the API's `CORS_ALLOWED_ORIGINS` counterpart |

Preview is deliberately unset for the last two. A Vercel preview gets a fresh `*.vercel.app`
hostname per deployment, and `CORS_ALLOWED_ORIGINS` is an exact-match list — so a preview build
pointed at the production API fails at the browser no matter what is configured here. Previews stay
API-less until either the allowlist takes a pattern or previews get their own API.

Local development does not read any of these; it decrypts `.env.local.enc` instead. The two lists
overlap but are not the same list, which is the usual way a deploy breaks — a variable added to the
`.enc` and never added here fails only in production, and only at runtime.

Database is Neon Postgres 17 in `aws-us-east-1`, matching Vercel's default `iad1` function region so
queries don't cross the country. The app connects through the **pooled** endpoint; the Prisma CLI
uses the **direct** one, because PgBouncer doesn't keep session state and Prisma Migrate's advisory
locks need it.

Deploy: `vercel deploy --prod` from the repo root — not from `apps/web`, since `rootDirectory` is
resolved relative to the repo root and would double up.

Migrations are applied deliberately with `prisma migrate deploy`, never from the build — see
DECISIONS.md.
