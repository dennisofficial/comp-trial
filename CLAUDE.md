# comp-trial

Deployable full-stack boilerplate — monitoring and analytics wired, no product yet. Waiting on the
spec. Turborepo · Bun · Next.js 16 · NestJS · Prisma · Postgres (Neon) · Sentry · PostHog; web
deploys to Vercel, API to DigitalOcean App Platform.

## What's here

```
apps/web/         Next.js 16 App Router — presentation only, no data layer
  src/store/
    base-api.ts     empty createApi slice: baseUrl + credentials
    generated/      @rtk-query/codegen-openapi output — committed, never hand-edited
    api.ts          the import surface: re-exports the generated hooks, holds enhancements
    store.ts        makeStore() factory — never a singleton
    preload.ts      Server Component prefetch → preloadedState for the client store
  src/lib/
    env.ts          t3-env `createEnv` over the NEXT_PUBLIC_* vars
    validators/     Zod schemas for forms (client-side UX validation)
apps/api/         NestJS — owns every read and write. See apps/api/CLAUDE.md.
  src/pings/       feature module: controller, service, DTOs, __tests__
  src/openapi/     DocumentBuilder config + the openapi.json generator
  src/config/env/  ConfigModule + Zod schema; IEnvConfig is inferred from it
  src/app.config.ts   versioning + ValidationPipe options, shared by main.ts and the generator
  src/instrument.ts   Sentry init, must stay the first import in the process
packages/db/      Prisma schema + client singleton — imported by apps/api only
```

There is **no `apps/portal`, no `packages/auth`, no `packages/ui`.**

`apps/web` has **no route handlers, no service layer, and no database access.** It reaches
`apps/api` through the generated client; Server Components may prefetch from the API but must not
hold business logic. Adding a feature means: endpoint in `apps/api` → `openapi:generate` →
`openapi:codegen` → use the generated hook.

## Ground rules

- **No auth.** Nothing sits behind a guard. When the spec needs it, the guard goes on the NestJS
  controller — not in Next middleware.
- **Single-tenant.** No `organizationId` scoping anywhere. Multi-tenancy is a data-model decision,
  not a retrofit — settle it before the first real model lands.
- **Data fetching is RTK Query, generated from the OpenAPI spec.** No SWR, no server actions, no
  `next-safe-action`, no hand-written fetch wrapper.
- **UI is shadcn/ui + `lucide-react`.**
- **Tests are Vitest in both apps**, not Jest.

## Code style

- **Max 300 lines per file.** Split into focused modules if exceeded.
- **No `as any`. No `@ts-ignore` / `@ts-expect-error`.** Fix the type.
- Zod at every boundary; prefer types over interfaces; generics over `any`.
- Early returns; named parameters at 2+ arguments; `handle` prefix on event handlers.
- Forms are React Hook Form + Zod — schema first, `z.infer` for the type, `Controller` for Select
  and Combobox, never `useState` for a field value.
- Prisma: prefixed CUIDs (`generate_prefixed_cuid('prefix'::text)`), one file per model under
  `packages/db/prisma/schema/`, transactions for multi-record writes.
- Every feature ships with tests. TDD preferred.
- Conventional commits. **Never commit without consent.** Never `git stash`, never `--no-verify`.

## Commands

- **Package manager is `bun`.** Never npm/yarn/pnpm.
- **Build**: `bun run build` (turbo). Filter: `bun run build --filter=web`. With local secrets:
  `cd apps/web && bun run build:local`
- **Typecheck**: `bun run typecheck` (runs `next typegen` first — `LayoutProps` lives in `.next/types`)
- **Tests**: `bun run test`, or `cd apps/{web,api} && bunx vitest run`
- **Lint**: `bun run lint`
- **Migrations**: `cd packages/db && bun run db:migrate --name <name>` (goes through `env:inject`;
  bare `bunx prisma` has no `DIRECT_URL`)
- **Secret hygiene**: `bun run env:check` before committing; `git ls-files | grep env` must show
  `.enc` and never `.env.keys` / `.env.personal`

### API contract

Run both, in order, after any change to a controller, DTO, or `@ApiTags`:

1. `cd apps/api && bun run openapi:generate` — rewrites the committed `openapi.json` (needs
   `DATABASE_URL`, so it goes through `env:inject`; nothing is instantiated, no connection opened)
2. `cd apps/web && bun run openapi:codegen` — rewrites `src/store/generated/api.ts`

Both outputs are committed: Vercel builds `apps/web` alone, with no Nest build and no API secrets,
so it needs the checked-in spec and client to typecheck against. CI's `openapi contract` job reruns
both and diffs, using `openapi:generate:ci` (no `env:inject`, so no private key in CI) and a
placeholder `DATABASE_URL`. Give every operation an explicit `operationId`, or the generated hook is
named `usePingsControllerListQuery`.

Both paths are in `.prettierignore`. Formatting a generated file breaks the check permanently — it
would diff raw generator output against a prettier-rewritten copy. `openapi:check` is the same
comparison scoped to one side, for running locally.

## Environment variables

- **Never add a plaintext `.env`.** Values go in the package's `.env.local.enc` (encrypted,
  committed); the key is in a git-ignored `.env.keys` beside it; `.env.personal` is a git-ignored
  plaintext overlay for local-only overrides.
- Adding a variable touches the package's `.env.local.enc`, `.env.example`, and the package's
  schema. **Insert the key into the `.enc` manually at the right line first, then `dotenvx set`** —
  `set` on an unknown key appends to the bottom and breaks alignment.
- **Never put a port in a dotenv file.** Local dev uses the API's schema default (4000) and Next's
  own (3000); deployment uses the container (`ENV PORT` in the Dockerfile, `http_port` in the App
  Platform app spec). A dotenv entry is a third source able to disagree, and the symptom is a healthy
  container on a port nothing routes to. If 3000 or 4000 is occupied locally, free it — letting
  Next auto-increment produces the CORS mismatch below.
- **Never set `NODE_ENV` in a dotenv file.**
- **`NEXT_PUBLIC_API_URL` and the API's `CORS_ALLOWED_ORIGINS` are two halves of one setting.**
  Change one origin and you change both, in both environments. Disagreement fails only in a browser,
  only cross-origin — local dev and the whole test suite pass while the deployed app is broken.
- `apps/web` reads its public vars through `src/lib/env.ts` (`createEnv` from `@t3-oss/env-nextjs`),
  not `process.env`. A var goes in the `client` bucket (`NEXT_PUBLIC_`-prefixed) or the `server`
  bucket, plus a `runtimeEnv` entry that is a literal `process.env.X` read — Next inlines
  `NEXT_PUBLIC_*` by textual substitution, so a computed lookup is `undefined` in the browser. Never
  widen a `server` key to `client` to silence the "server-side environment variable on the client"
  error; that error is the bundle boundary working. The Sentry config files are exempt — they run
  before the app and are wired by the Sentry wizard.
- `apps/web` has no `DATABASE_URL`. If something there seems to need one, the endpoint belongs in
  `apps/api`.
- Scripts needing secrets go through the package's `env:inject`. `build`, `start`, and `db:deploy`
  stay bare — they run where the platform supplies the environment, and must not require a key.

API-side env rules (`EnvService` over `process.env`, `IEnvConfig` inference, `EnvModule.forRoot`)
live in `apps/api/CLAUDE.md`.

## React imports

**Never `import * as React`.** The automatic JSX runtime (`"jsx": "react-jsx"`) means React is not
needed in scope to render, and `React.ComponentProps` only resolves via the UMD global. Import the
types you use — `import type { ComponentProps } from 'react'` — and named hooks from `'react'`.
shadcn generates the namespace import; strip it when adding a component.

## Comments

Expressive code, not commentary. A comment earns its place only when it says something the code
cannot: a constraint a future edit would silently break (import order, sampling multiplied by
another rate, an unproxied DNS record), why code that looks wrong is right (a bare `catch`, a
conditional datasource), or a `TEMPORARY` marker. Two lines is usually the ceiling.

Never write a comment that restates the signature, names the file's own contents, or re-explains an
architectural choice. If a block needs a paragraph to explain, that is a naming problem.

## Agent tooling

### Skills

Third-party skills are vendored: `skills-lock.json` pins source and content hash,
`.agents/skills/<name>/` holds the body, `.claude/skills/<name>` symlinks into it. All three are
committed, so a clone is useful immediately and a version bump is a reviewable diff. Hand-authored
project skills are real directories under `.claude/skills/`; only vendored ones are symlinks.

- **Restore or update**: `bun run skills:install` — **Add**: `bunx skills add <owner>/<repo> -s <skill> -a claude-code -y` — **List**: `bun run skills:list`

Installed: **`nestjs-best-practices`** (`Kadajett/agent-nestjs-skills`) — invoke before writing
NestJS code.

**`posthog-best-practices`** is vendored differently, from a release asset. `PostHog/context-mill`
builds its skills into releases rather than committing them, and `skills-lock.json` can't name a
`SKILL.md` path that doesn't exist in the repo tree — one such entry fails the entire restore,
including the lock-managed skills. So its provenance lives in `.agents/skills/<name>/.source.json`
(release tag, asset, sha256) instead.

- **Verify against upstream**: `bun run skills:verify` (downloads, compares digests, writes nothing)
- **Re-fetch or bump**: edit `release` + `sha256` in `.source.json`, then `bun run skills:vendor`

The `posthog:instrument-*` skills already come from the PostHog plugin — same context-mill assets,
don't vendor them again.

### MCP

`.mcp.json` is committed and holds servers specific to this stack. Personal servers stay in your own
config.

| Server         | Why                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------- |
| `prisma`       | schema + migrations; runs in `packages/db` so it finds `prisma.config.ts`                     |
| `sentry`       | issues and traces for both apps (OAuth, no token in the file)                                 |
| `digitalocean` | the App Platform service that runs `apps/api`                                                 |
| `posthog`      | read-only inspection of the analytics project; events come from the browser SDK in `apps/web` |

**No secrets in `.mcp.json`** — tokens come in as `${DIGITALOCEAN_API_TOKEN}` and
`${POSTHOG_PERSONAL_API_KEY}`. Both expand from the environment Claude Code was **launched** in, so
no runtime hook can supply them; `direnv` does it on `cd`, via a committed `.envrc` that reads the
git-ignored `.env.personal`. After editing either: `direnv allow`, then restart Claude Code. A
`Missing environment variables` warning at startup means that chain is broken — usually a missing
`direnv allow`, or Claude started from outside the repo.

**The DigitalOcean token must be read-only.** `DIGITALOCEAN_API_TOKEN` is deliberately a different
token from the `DIGITALOCEAN_TOKEN` Terraform uses. `apps.mcp.digitalocean.com` can create, update,
and destroy apps; Terraform owns that infrastructure, and a write-scoped token here means an agent
can put the account into a state the next `plan` has to reconcile.

## Definition of done

Typechecks, tests pass, deployed to Vercel.
