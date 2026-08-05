# comp-trial

Full-stack app for the Comp AI work trial. Turborepo · Bun · Next.js 16 · NestJS 11 · Prisma 7 ·
Postgres (Neon). The web app deploys to Vercel, the API to DigitalOcean App Platform.

**Web:** https://comp-trial.dennislysenko.com · **API:**
[`/v1/health`](https://comp-api.dennislysenko.com/v1/health) ·
[docs](https://comp-api.dennislysenko.com/api/docs)

The health check is a real database round-trip, so a 200 there means a reachable database.

## Shape of it

`apps/api` owns every read and write. `apps/web` renders — it has no database access, no route
handlers, and no service layer, and an ESLint rule blocks it from importing `@repo/db`. The two are
joined by the API's OpenAPI spec: the spec generates a typed RTK Query client, both are committed,
and CI fails if either drifts from the code.

```
browser ──▶ apps/web (Vercel)         Server Components prefetch, client store hydrates
                │
                │ generated RTK Query client, NEXT_PUBLIC_API_URL
                ▼
            apps/api (DigitalOcean)   NestJS — validation, business logic, Prisma
                │
                ▼
            Neon Postgres             pooled at runtime, direct for migrations
```

Adding a feature: endpoint in `apps/api` → `openapi:generate` → `openapi:codegen` → use the
generated hook. Never the other way round.

## Layout

```
apps/api/              NestJS 11 — the only backend
  src/pings/           feature module: controller, service, dto/, __tests__/
  src/health/          /v1/health — 503 when Postgres does not answer
  src/config/env/      ConfigModule + Zod schema; IEnvConfig is inferred from it
  src/observability/   metrics interceptor
  src/prisma/          PrismaService, lifecycle-bound
  src/openapi/         DocumentBuilder config + the spec generator
  src/app.config.ts    versioning + ValidationPipe options, shared by main.ts and the generator
  src/instrument.ts    Sentry init — must stay the first import in the process
  openapi.json         committed output of openapi:generate
  Dockerfile           what App Platform builds
apps/web/              Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui
  src/app/             routes only — no route handlers
  src/components/      UI, plus ui/ from shadcn
  src/store/
    base-api.ts        empty createApi slice: baseUrl + credentials
    generated/api.ts   codegen output — committed, never hand-edited
    api.ts             the import surface: re-exports the generated hooks, holds enhancements
    store.ts           makeStore() factory — never a singleton
    preload.ts         Server Component prefetch → preloadedState for the client store
  src/lib/
    env.ts             t3-env createEnv over the public vars
    validators/        Zod schemas for form UX (the API is the authority)
packages/db/           Prisma schema + generated client — imported by apps/api only
  prisma/schema/       one file per model
```

There is no `apps/portal`, no `packages/auth`, no `packages/ui`, and no `infra/` — the Terraform
that once held Cloudflare DNS and the Vercel domain was removed in `3a993d1`.

## Setup

Bun 1.3.4, pinned by `packageManager` in `package.json`.

A checkout needs the three decryption keys — `apps/web/.env.keys`, `apps/api/.env.keys`,
`packages/db/.env.keys`. They are git-ignored, so ask for them, or re-encrypt with your own (see
[Environment](#environment)). Without them every `env:inject` script fails.

```bash
bun install
cd packages/db && bun run env:inject -- prisma migrate deploy && cd ../..
bun run dev
```

`bun run dev` starts both apps: web on 3000, api on 4000. If either port is taken, free it — don't
let Next auto-increment. The port it picks won't be in the API's `CORS_ALLOWED_ORIGINS`, and the
failure shows up only in the browser, only on the first request.

`db:deploy` is bare `prisma migrate deploy` on purpose, so a platform deploy never needs a private
key. That is why the local command above goes through `env:inject` instead.

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

Which package owns which variable:

| Package       | Variables                                                                              |
| ------------- | -------------------------------------------------------------------------------------- |
| `apps/web`    | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_POSTHOG_*`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` |
| `apps/api`    | `DATABASE_URL`, `CORS_ALLOWED_ORIGINS`, `SENTRY_DSN`                                   |
| `packages/db` | `DATABASE_URL`, `DIRECT_URL` — Prisma CLI only                                         |

Scripts that need secrets go through the package's `env:inject`, which decrypts into the
environment for the duration of one command. Scripts that run where the platform already supplies
the variables — `build`, `start`, `db:deploy` — stay outside dotenvx on purpose. To build the web
app locally against the encrypted values, use `build:local`.

Adding a variable means touching the package's `.env.local.enc` (insert the key manually at the
right line, then `dotenvx set` — `set` on an unknown key appends to the bottom and breaks the
alignment), `.env.example`, and the package's schema: the Zod `envSchema` in
`apps/api/src/config/env/validation.ts` for the API, the `createEnv` call in
`apps/web/src/lib/env.ts` for the web app. The API's `IEnvConfig` is inferred from that schema and
the web app's `env` object from its buckets, so there is nothing to keep in sync by hand.

`NEXT_PUBLIC_API_URL` and `CORS_ALLOWED_ORIGINS` are two halves of one setting, in both
environments. `CORS_ALLOWED_ORIGINS` is an exact-match list; change one origin and you change both.

Never put `PORT` or `NODE_ENV` in a dotenv file — `.env.example` explains why at length.

## Commands

| Command                                              | What it does                                        |
| ---------------------------------------------------- | --------------------------------------------------- |
| `bun run dev`                                        | Both apps in watch mode, env decrypted              |
| `bun run build`                                      | Turbo build (runs `db:generate` first)              |
| `bun run typecheck`                                  | `tsc --noEmit` across the workspace                 |
| `bun run test`                                       | Vitest, both apps                                   |
| `bun run lint`                                       | ESLint                                              |
| `bun run format`                                     | Prettier                                            |
| `bun run env:check`                                  | Fail if a plaintext secret is about to be committed |
| `cd packages/db && bun run db:migrate --name <name>` | New migration                                       |
| `cd packages/db && bun run db:studio`                | Prisma Studio                                       |
| `bun run skills:install`                             | Restore the vendored agent skills                   |

CI runs `typecheck`, `test`, and `lint` as independent matrix jobs, plus the contract check below.

## The API contract

Run both, in order, after any change to a controller, DTO, or `@ApiTags`:

```bash
cd apps/api && bun run openapi:generate    # rewrites apps/api/openapi.json
cd apps/web && bun run openapi:codegen     # rewrites src/store/generated/api.ts
```

Both outputs are committed. Vercel builds `apps/web` alone — no Nest build, no API secrets — so it
needs the checked-in spec and client to typecheck against. CI's `openapi contract` job reruns both
and diffs; it uses `openapi:generate:ci` (no `env:inject`, so no private key in CI) with a
placeholder `DATABASE_URL`. Nothing is instantiated and no connection is opened.

Give every operation an explicit `operationId`, or the generated hook is named
`usePingsControllerListQuery` instead of `useListPingsQuery`.

Both paths are in `.prettierignore`. Formatting a generated file breaks the check permanently — it
would diff raw generator output against a prettier-rewritten copy. `openapi:check` is the same
comparison scoped to one side, for running locally.

## Testing

Vitest in both apps, one runner and one config dialect across the monorepo. `@nestjs/testing` works
unchanged.

```bash
bun run test                      # everything
cd apps/api && bunx vitest run    # or one app
```

Tests sit next to the code in `__tests__/`. The weight is on the places where a bug is silent
rather than loud: env validation, the DTO and the Zod schema that mirror each other, the service
layer, the metrics interceptor, and the Server Component preload — where a missing `await` yields
an empty store and a page that merely looks slow.

`apps/web/src/lib/validators/ping.ts` and `apps/api/src/pings/dto/create-ping.dto.ts` are not
shared — one is Zod for form UX, the other is `class-validator` at the HTTP boundary. A type-level
assertion in the validator fails `typecheck` if the DTO gains or renames a field, so the two can
diverge in message wording but not in shape.

## Deployment

### apps/web → Vercel

Project `comp-trial`, root directory `apps/web`:

| Setting | Value                                    |
| ------- | ---------------------------------------- |
| Install | `cd ../.. && bun install`                |
| Build   | `cd ../.. && bun run build --filter=web` |

`build` runs outside dotenvx on purpose, so everything it needs lives in the Vercel project rather
than in a `.enc` file:

| Variable                                | Prod | Preview | Dev | Why                                                    |
| --------------------------------------- | :--: | :-----: | :-: | ------------------------------------------------------ |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` |  ✓   |    ✓    |  —  | server+edge / browser — both are needed, they differ   |
| `SENTRY_AUTH_TOKEN`                     |  ✓   |    ✓    |  —  | build-time source map upload                           |
| `NEXT_PUBLIC_POSTHOG_KEY` / `..._HOST`  |  ✓   |    —    |  —  | production only, so preview clicks stay out of funnels |
| `NEXT_PUBLIC_API_URL`                   |  ✓   |    —    |  —  | the API origin; must match `CORS_ALLOWED_ORIGINS`      |

Preview is deliberately unset for the last two. A Vercel preview gets a fresh `*.vercel.app`
hostname per deployment, and `CORS_ALLOWED_ORIGINS` is an exact-match list — so a preview build
pointed at the production API fails at the browser no matter what is configured here. Previews stay
API-less until either the allowlist takes a pattern or previews get their own API.

Deploy: `vercel deploy --prod` from the repo root — not from `apps/web`, since `rootDirectory` is
resolved relative to the repo root and would double up.

### apps/api → DigitalOcean App Platform

App `comp-trial-api`, region `nyc`, one `basic-xxs` instance, built from `apps/api/Dockerfile` with
the repo root as build context. Deploy-on-push from `main` — there is no deploy step in CI.

| Setting      | Value                                                                    |
| ------------ | ------------------------------------------------------------------------ |
| Domain       | `comp-api.dennislysenko.com` → `comp-trial-api-hi8x2.ondigitalocean.app` |
| `http_port`  | 8080 — must equal `ENV PORT` in the Dockerfile                           |
| Health check | `/v1/health`                                                             |
| Runtime env  | `NODE_ENV`, `CORS_ALLOWED_ORIGINS`, `DATABASE_URL` (encrypted secret)    |

The health check is a real database round-trip: `SELECT 1` through Prisma, 503 on failure. A green
instance therefore means a reachable database, which is why it is the App Platform probe and not a
static 200.

The port appears in exactly two places — `ENV PORT` in the Dockerfile and `http_port` here. The env
schema's 4000 default is local dev only and is never reached in the container. A third source in a
dotenv file is how you get a healthy container on a port nothing routes to.

`SENTRY_DSN` is not currently set on the app, so the API's Sentry integration is a no-op in
production. The value it wants is the DSN of the **`comp-trial-api`** Sentry project — not the web
app's, which reports to `javascript-nextjs`. Add it as a plain `RUN_TIME` variable, not a `SECRET`:
a DSN is an ingest identifier, not a credential, and the web half of the same pair already ships
inside the browser bundle.

### Database

Neon Postgres 17 in `aws-us-east-1`. The apps connect through the **pooled** endpoint; the Prisma
CLI uses the **direct** one, because PgBouncer doesn't keep session state and Prisma Migrate's
advisory locks need it.

Migrations are applied deliberately with `prisma migrate deploy`, never from a build — a build that
migrates turns every rollback into a data problem.

## Agent tooling

Vendored skills, MCP servers, and the conventions this repo holds itself to are documented in
[`CLAUDE.md`](./CLAUDE.md), with NestJS-specific rules in
[`apps/api/CLAUDE.md`](./apps/api/CLAUDE.md).
