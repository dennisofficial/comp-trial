# Project Rules

## Tooling

- **Package manager**: `bun` (never npm/yarn/pnpm)
- **Build**: `bun run build` (uses turbo). Filter: `bun run --filter '@trycompai/app' build`
- **Typecheck**: `bun run typecheck` or `npx turbo run typecheck --filter=@trycompai/api`
- **Tests (app)**: `cd apps/app && npx vitest run`
- **Tests (api)**: `cd apps/api && npx jest src/<module> --passWithNoTests`
- **Lint**: `bun run lint`

## Code Style

- **Max 300 lines per file.** Split into focused modules if exceeded.
- **No `as any` casts.** Ever. Use proper types, generics, or `unknown` with type guards.
- **No `@ts-ignore` or `@ts-expect-error`.** Fix the type instead.
- **Strict TypeScript**: Use zod for runtime validation, generics over `any`.
- **Early returns** to avoid nested conditionals.
- **Named parameters** for functions with 2+ arguments.
- **Event handlers**: prefix with `handle` (e.g., `handleSubmit`).
- **Types vs Interface**: Perfer types over interfaces, unless justfied.

## Monorepo Structure

```
apps/
  api/          # NestJS API (auth, RBAC, business logic)
  app/          # Next.js frontend (compliance + security products)
packages/
  db/           # Prisma schema + client
```

## Authentication & Session

- **Auth lives in `apps/api` (NestJS).** The API is the single source of truth for authentication via better-auth. All apps and packages that need to authenticate (app, portal, device-agent, etc.) MUST go through the API — never run a local better-auth instance or handle auth directly in a frontend app.
- **Session-based auth only.** No JWT tokens. Cross-subdomain cookies (`.trycomp.ai`) allow sessions to work across all apps.
- **HybridAuthGuard** supports 3 methods in order: API Key (`x-api-key`), Service Token (`x-service-token`), Session (cookies). `@Public()` skips auth.
- **Client-side auth**: `authClient` (better-auth client) with `baseURL` pointing to the API, NOT the current app.
- **Client-side data**: `apiClient` from `@/lib/api-client` (always sends cookies).
- **Server-side data**: `serverApi` from `@/lib/api-server.ts`.
- **Server-side session checks**: Proxy to the API's `/api/auth/get-session` endpoint — do NOT instantiate better-auth locally.
- **Raw `fetch()` to API**: MUST include `credentials: 'include'`, otherwise 401.

## API Architecture

We are migrating away from Next.js server actions toward calling the NestJS API directly.

### Simple CRUD operations

Client components call the NestJS API via custom SWR hooks. No server action wrapper needed.

### Multi-step orchestration

When an operation requires multiple API calls (e.g., S3 upload + PATCH), create a Next.js API route (`apps/app/src/app/api/...`) that orchestrates them.

### What NOT to do

- Do NOT use server actions for new features
- Do NOT keep server actions as wrappers around API calls
- Do NOT add direct database (`@db`) access in the Next.js app for mutations — always go through the API
- Do NOT use `useAction` from `next-safe-action` for new code

### API Client

- Server-side (Next.js API routes/pages): `serverApi` from `apps/app/src/lib/api-server.ts`
- Client-side (hooks): `apiClient` / `api` from `@/lib/api-client`

### API Response Format

- **List endpoints**: `{ data: [...], count, authType, authenticatedUser }` → access via `response.data.data`
- **Single resource endpoints**: `{ ...entity, authType, authenticatedUser }` → access via `response.data`
- Both `apiClient` and `serverApi` wrap in `{ data, error, status }`

## RBAC

### Permissions Model

- Flat `resource:action` model (e.g., `pentest:read`, `control:update`)
- Single source of truth: `packages/auth/src/permissions.ts`
- Built-in roles: `owner`, `admin`, `auditor`, `employee`, `contractor`
- Custom roles: stored in `organization_role` table per organization
- Multiple roles per user (comma-separated in `member.role`)

### Multi-Product Architecture

- **Products** (compliance, pen testing) are org-level subscription/feature flags — NOT RBAC
- **RBAC** controls user access within products
- `app:read` gates the compliance dashboard; `pentest:read` gates security product
- Portal-only resources (`policy`, `compliance`) do NOT grant app access

### API Endpoint Requirements

Every customer-facing API endpoint MUST have:

```typescript
@UseGuards(HybridAuthGuard, PermissionGuard)  // at controller or endpoint level
@RequirePermission('resource', 'action')       // on every endpoint
```

- Controller format: `@Controller({ path: 'name', version: '1' })`, NOT `@Controller('v1/name')`
- `@Public()` for unauthenticated endpoints (webhooks, etc.)
- The `AuditLogInterceptor` only logs when `@RequirePermission` metadata is present

### Frontend Permission Gating

- **Nav items**: Gate with `canAccessRoute(permissions, 'routeSegment')`
- **Rail icons**: Gate product sections (Compliance, Security, Trust, Settings) by permission
- **Mutation buttons**: Gate with `hasPermission(permissions, 'resource', 'action')`
- **Page-level**: Every product layout uses `requireRoutePermission('segment', orgId)` server-side
- **Route permissions**: Defined in `ROUTE_PERMISSIONS` in `apps/app/src/lib/permissions.ts`
- No manual role string parsing (`role.includes('admin')`) — always use permission checks

### Permission Resources

`organization`, `member`, `control`, `evidence`, `policy`, `risk`, `vendor`, `task`, `framework`, `audit`, `finding`, `questionnaire`, `integration`, `apiKey`, `trust`, `pentest`, `app`, `compliance`

## Design System

- **Always prefer `@trycompai/design-system`** over `@trycompai/ui`. Check DS exports first.
- `@trycompai/ui` is the legacy library being phased out — only use as last resort.
- **Icons**: `@trycompai/design-system/icons` (Carbon icons), NOT `lucide-react`
- **DS components that do NOT accept `className`**: `Text`, `Stack`, `HStack`, `Badge`, `Button` — wrap in `<div>` for custom styling
- **Layout**: Use `PageLayout`, `PageHeader`, `Stack`, `HStack`, `Section`, `SettingGroup`
- **Patterns**: Sheet (`Sheet > SheetContent > SheetHeader + SheetBody`), Drawer, Collapsible
- **Responsive (MANDATORY)**: every UI change must work on mobile (375px), tablet (768px), desktop (1280px), and large desktop (1920px) by default — no one has to ask. See the `responsive-ui` skill for breakpoints, repo patterns, and the checklist.
- **After editing any frontend component**: Run the `audit-design-system` skill to catch `@trycompai/ui` or `lucide-react` imports that should be migrated

## Data Fetching

- **Server components**: Fetch with `serverApi`, pass as `fallbackData` to client
- **Client components**: `useSWR` with `apiClient` or custom hooks (e.g., `usePolicy`, `useTask`)
- **SWR hooks**: Use `fallbackData` for SSR initial data, `revalidateOnMount: !initialData`
- **`mutate()` safety**: Guard against `undefined` in optimistic update functions
- **`Array.isArray()` checks**: When consuming SWR data that could be stale

## Testing

- **Every new feature MUST include tests.** No exceptions.
- **TDD preferred**: Write failing tests first, then make them pass.
- **App tests**: Vitest + @testing-library/react (jsdom environment)
- **API tests**: Jest with NestJS testing utilities
- **Permission tests**: Test admin (write) and read-only user scenarios
- **Run from package dir**: `cd apps/app && npx vitest run` or `cd apps/api && npx jest`

## Database

- **Schema**: `packages/db/prisma/schema/` (split into files per model)
- **IDs**: Always use prefixed CUIDs: `@default(dbgenerated("generate_prefixed_cuid('prefix'::text)"))`
- **Migrations**: `cd packages/db && bunx prisma migrate dev --name your_name`
- **Multi-tenancy**: Always scope queries by `organizationId`
- **Transactions**: Use for operations modifying multiple records

## Git

- **Never commit without users consent**
- **Conventional commits**: `<type>(<scope>): <description>` (imperative, lowercase)
- **Never use `git stash`** unless explicitly asked
- **Never skip hooks** (`--no-verify`)
- **Never force push** to main/master

## Forms

- All forms use **React Hook Form + Zod** validation
- Define Zod schema first, infer type with `z.infer<typeof schema>`
- Use `Controller` for complex components (Select, Combobox)
- Never use `useState` for form field values

---

# This repo

Everything above is Comp AI's own `CLAUDE.md`, copied verbatim. It's the standard this build is
held to. Where it describes infrastructure that doesn't exist here, this section wins.

## What's actually here

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
apps/api/         NestJS — owns every read and write
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

## Deliberate deviations

| Their rule                                                    | Here                                                                                       | Why                                                                                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| NestJS API is the source of truth; never hit the DB from Next | Followed. `apps/web` has no `@repo/db` dependency and an ESLint rule blocks reimporting it | Was collapsed into Next for the scaffold, then split on request. The lift cost one import. See DECISIONS.md.                |
| `serverApi` / `apiClient`, hand-written, + SWR hooks          | RTK Query generated from the API's OpenAPI spec                                            | Same shape as Comp's, minus the hand-declared response types that let API and frontend drift. See DECISIONS.md.             |
| RBAC guards + `@RequirePermission` on every endpoint          | No auth yet                                                                                | Deferred until the spec calls for it. If it does, the guard pattern is what to mirror.                                      |
| `@trycompai/design-system`, Carbon icons                      | shadcn/ui + `lucide-react`                                                                 | Their DS is a private package. shadcn is the same Radix lineage.                                                            |
| Auth via better-auth in `apps/api`                            | None                                                                                       | Same as above — spec-dependent                                                                                              |
| Scope every query by `organizationId`                         | Single-tenant until the spec says otherwise                                                | Multi-tenancy is a data-model decision, not a retrofit — revisit before the first real model lands                          |
| API tests run on Jest + `ts-jest`                             | Vitest, same as the web app                                                                | One runner, one config dialect, one set of globals across the monorepo. Nest DI works unchanged — see DECISIONS.md.         |
| Plaintext `.env` / `.env.local` per package                   | dotenvx: committed `.env.local.enc`, git-ignored `.env.keys` + `.env.personal`             | A checkout is runnable without a side-channel secret handoff, and a secret rotation shows up in the diff. See DECISIONS.md. |

## Environment variables

- **Never add a plaintext `.env`.** Values go in the package's `.env.local.enc` (encrypted, committed); the key is in a git-ignored `.env.keys` beside it; `.env.personal` is a git-ignored plaintext overlay for local-only overrides.
- Adding a variable touches: the `.env.local.enc` (insert the key manually at the right line **first**, then `dotenvx set` — `set` on an unknown key appends to the bottom and breaks alignment), `.env.example`, and for the API the `envSchema` in `apps/api/src/config/env/validation.ts`. **Never hand-write the env type** — `IEnvConfig` is `z.infer` of that schema.
- **Never read `process.env` in API app code** — inject `EnvService` and call `env.get('KEY')`. It is typed non-`undefined` because the schema requires or defaults every key; only `.optional()` keys come back `| undefined`. The one sanctioned exception is code that runs _before_ the Nest container exists: `src/instrument.ts` (Sentry must patch `http` before anything imports it). It says so in a comment; adding a second needs the same justification.
- Env validation is **Zod**: `ConfigModule.forRoot({ validate })` takes a plain function, and unlike Joi it infers. Don't reintroduce Joi + a hand-written interface.
- **No barrel `index.ts` files in `apps/api`.** Import the concrete module — `./config/env/env.service`, not `./config/env`. Barrels in NestJS pull a whole directory in on any import, which is how modules end up circularly dependent on each other and how DI starts resolving `undefined` providers for reasons that read as unrelated. Import paths being longer is the cheaper problem.
- **Request DTOs are `class-validator`; everything else is Zod.** `@nestjs/swagger` reads decorator metadata off DTO _classes_ to build the OpenAPI schema that types the generated frontend client — Zod produces none without a bridging library. So: `class-validator` for what arrives over HTTP, Zod for env and the web app's shared validators. A DTO exists only when a controller signature demands one. See `apps/api/CLAUDE.md`.
- **Never put a port in a dotenv file.** `PORT` is absent for the same reason `NODE_ENV` is. Local dev uses the schema default in `apps/api/src/config/env/validation.ts` (4000) and Next's own default (3000); deployment uses the container (`ENV PORT` in the Dockerfile, `http_port` in the DO terraform). A dotenv entry would be a third source able to disagree with those, and the symptom is a healthy container on a port nothing routes to. If 3000 or 4000 is occupied locally, free it — letting Next auto-increment produces the CORS mismatch below.
- **`NEXT_PUBLIC_API_URL` and the API's `CORS_ALLOWED_ORIGINS` are two halves of one setting.** Change one origin and you change both, in both environments. Disagreement fails only in a browser, only cross-origin — local dev and the whole test suite pass while the deployed app is broken.
- `apps/web` reads its public vars through `src/lib/env.ts` — `createEnv` from `@t3-oss/env-nextjs`, over Zod — not `process.env` directly. A var goes in the `client` bucket (and must be `NEXT_PUBLIC_`-prefixed) or the `server` bucket, plus a `runtimeEnv` entry that is a literal `process.env.X` read: Next inlines `NEXT_PUBLIC_*` by textual substitution, so a computed lookup is `undefined` in the browser. Never widen a `server` key to `client` to silence the "server-side environment variable on the client" error — that error is the bundle boundary working. The Sentry config files are the exception to all of this — they run before the app and are wired by the Sentry wizard.
- `apps/web` has no `DATABASE_URL`. If something there seems to need one, the endpoint belongs in `apps/api`.
- Never set `NODE_ENV` in a dotenv file.
- Scripts needing secrets go through the package's `env:inject`. `build`, `start`, and `db:deploy` stay bare — they run where the platform supplies the environment, and must not require a private key.

## Commands here

- **Build**: `bun run build` (turbo). Filter: `bun run build --filter=web`. Local build with secrets: `cd apps/web && bun run build:local`
- **Typecheck**: `bun run typecheck` (runs `next typegen` first — `LayoutProps` lives in `.next/types`)
- **Tests**: `bun run test` (turbo), or `cd apps/web && bunx vitest run` / `cd apps/api && bunx vitest run`
- **Migrations**: `cd packages/db && bun run db:migrate --name <name>` (goes through `env:inject`; bare `bunx prisma` has no `DIRECT_URL`)
- **Secret hygiene**: `bun run env:check` before committing; `git ls-files | grep env` must show `.enc` and never `.env.keys` / `.env.personal`
- **API contract** — run both, in order, after any change to a controller, DTO, or `@ApiTags`:
  1. `cd apps/api && bun run openapi:generate` — rewrites the committed `openapi.json` (needs `DATABASE_URL`, so it goes through `env:inject`; nothing is instantiated and no connection is opened)
  2. `cd apps/web && bun run openapi:codegen` — rewrites `src/store/generated/api.ts`

  Both outputs are committed — Vercel builds `apps/web` alone, with no Nest build and no API secrets, so it needs the checked-in spec and client to typecheck against. CI enforces it: the `openapi contract` job reruns both generators and diffs, using `openapi:generate:ci` (the bare variant — no `env:inject`, so no private key in CI) and a placeholder `DATABASE_URL`. Give every operation an explicit `operationId`, or the generated hook is named `usePingsControllerListQuery`.

  Both paths are in `.prettierignore`. Formatting a generated file makes the check fail forever — it would diff raw generator output against a prettier-rewritten copy. `openapi:check` in either package is the same comparison, scoped to one side, for running locally.

## Agent tooling

### Skills

Third-party skills are vendored, the same way Comp does it: `skills-lock.json` pins the source and
a content hash, `.agents/skills/<name>/` holds the body, and `.claude/skills/<name>` is a symlink
into it. All three are committed — a clone is useful immediately, and a skill version bump is a
reviewable diff rather than a silent change in someone's home directory.

- **Restore or update**: `bun run skills:install` (reads the lock, then relinks `.claude/skills/`)
- **Add one**: `bunx skills add <owner>/<repo> -s <skill> -a claude-code -y`
- **List**: `bun run skills:list`

Installed: **`nestjs-best-practices`** (`Kadajett/agent-nestjs-skills`) — invoke it before writing
NestJS code. See `apps/api/CLAUDE.md`.

Hand-authored project skills are real directories under `.claude/skills/`; only vendored ones are
symlinks. `skills:install` only touches what the lock names.

#### Skills vendored from release assets

`PostHog/context-mill` builds its ~430 skills into release assets instead of committing them, so
`skills-lock.json` cannot describe one: `experimental_install` calls `skills add` on every entry it
holds, and an entry naming a `SKILL.md` path that does not exist in the repo tree fails the whole
restore — including the skills that _are_ lock-managed. These get the same committed body and
symlink, with provenance in `.agents/skills/<name>/.source.json` (release tag, asset, sha256).

- **Verify against upstream**: `bun run skills:verify` (downloads, compares digests, writes nothing)
- **Re-fetch or bump**: edit `release` + `sha256` in `.source.json`, then `bun run skills:vendor`

Installed: **`posthog-best-practices`** — general PostHog guidance, framework-agnostic. Note the
`posthog:instrument-*` skills already come from the PostHog plugin; they are context-mill's
`omnibus-*` assets, so don't vendor those again.

### MCP

`.mcp.json` is committed and holds servers specific to this stack. Personal servers stay in your
own config — this file is what every checkout gets.

| Server         | Why                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------- |
| `prisma`       | schema + migrations; runs in `packages/db` so it finds `prisma.config.ts`                     |
| `sentry`       | issues and traces for both apps (OAuth, no token in the file)                                 |
| `digitalocean` | the App Platform service that runs `apps/api`                                                 |
| `posthog`      | read-only inspection of the analytics project; events come from the browser SDK in `apps/web` |

**No secrets in `.mcp.json`.** Tokens come in as `${DIGITALOCEAN_API_TOKEN}` and
`${POSTHOG_PERSONAL_API_KEY}`. Same rule as everywhere else here: the committed file names the key,
never the value.

Those two expand from the environment Claude Code was **launched** in — no runtime hook can supply
them, so `direnv` does it on `cd`:

- `.envrc` (committed, no secrets) does `dotenv_if_exists .env.personal`
- `.env.personal` (git-ignored plaintext) holds the values
- after editing either: `direnv allow`, then restart Claude Code

If startup warns `Missing environment variables`, that chain is broken — usually a missing
`direnv allow`, or Claude started from outside the repo.

**The DigitalOcean token must be read-only.** `DIGITALOCEAN_API_TOKEN` is deliberately a different
token from the `DIGITALOCEAN_TOKEN` Terraform uses. `apps.mcp.digitalocean.com` can create, update,
and destroy apps; Terraform owns that infrastructure, and a write-scoped token here means an agent
can put the account into a state the next `plan` has to reconcile. Read scope lets it inspect the
service and its logs, which is the whole point of having it.

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

Never write a comment that restates the signature, names the file's own contents, or paraphrases
`DECISIONS.md` — architecture rationale lives there, in one place, where it can be revised. If a
block needs a paragraph to explain, that is a naming problem, not a comment opportunity.

Rules that carry over unchanged: 300-line files, no `as any`, no `@ts-ignore`, Zod at every
boundary, early returns, named parameters, `handle` prefixes, RHF + Zod forms, prefixed CUID IDs,
split schema files, conventional commits, tests with every feature.

## Definition of done

Typechecks, tests pass, deployed to Vercel, and any spec gap resolved is recorded in DECISIONS.md.
