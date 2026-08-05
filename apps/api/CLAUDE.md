# apps/api — NestJS

## Before writing NestJS code

Run the **`/nestjs-best-practices`** skill. It is vendored into this repo — `skills-lock.json`
pins it, `bun run skills:install` restores it — so it is the same 42 rules on every checkout, not
whatever happens to be installed on your machine.

Load it when you are about to write or change a module, provider, controller, guard,
interceptor, or exception filter. The rules that bite first here are `arch-avoid-circular-deps`,
`di-prefer-constructor-injection`, `arch-single-responsibility`, and `error-use-exception-filters`.
`rules/<rule-id>.md` has the long form of each; `AGENTS.md` in the skill is the whole thing
compiled if you want to read it end to end.

Where the skill and this file disagree, this file wins — the deviations below are deliberate.

## NEVER write a barrel `index.ts`

No `index.ts` that re-exports a directory. Not in `config/`, not in a feature module, not
"just for the DTOs". Import the concrete file:

```ts
// ✅
import { EnvService } from './config/env/env.service';

// ❌ — never
import { EnvService } from './config/env';
```

Why this is a hard rule and not a style preference: a barrel makes any import of one symbol
execute the whole directory. In a DI container that turns into two failures that are miserable to
diagnose — modules that become circularly dependent through a file neither of them names, and
providers that resolve to `undefined` because a decorator ran before the class it decorates was
initialised. The stack trace points somewhere unrelated. Longer import paths are the cheaper
problem, and they are honest about what the file actually depends on.

This also means: no `export * from` anywhere.

## NEVER put a helper function outside the class that uses it

If only one class calls it, it is a `private` method on that class. Not a module-level `function`
below the class, not a `const fn = () =>` above it.

```ts
// ❌ — a loose function in a file that exports a class
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const route = resolveRoutePath(request);
    // ...
  }
}

function resolveRoutePath(request: Request): string {
  /* ... */
}

// ✅
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const route = this.resolveRoutePath(request);
    // ...
  }

  private resolveRoutePath(request: Request): string {
    /* ... */
  }
}
```

Why: a module-level function is part of the file's public surface whether or not it's exported —
the next person to need something similar imports it, and now a change for one caller silently
affects another. `private` states the scope the code actually has. It also keeps the unit of
behaviour whole: the class is the thing under test, and a helper reachable only through it can't
drift into being tested separately from the logic that depends on it.

Corollaries:

- **Public methods first, `private` helpers after them.** Read the class top-down.
- **A mapper belongs to its DTO** as a `static`, not a loose `toXDto()` beside it —
  `PingDto.from(record)`. Statics carry no `@ApiProperty` metadata, so the emitted OpenAPI schema
  is unaffected.
- **Shared by two or more classes?** It gets its own file and, if it needs DI, its own
  `@Injectable()` provider. It never sits loose in a file that exports something else.

The only functions that may live at module level are those with no class to belong to, because
they run before or outside the DI container:

| File                       | Function                 | Why                                                                |
| -------------------------- | ------------------------ | ------------------------------------------------------------------ |
| `main.ts`                  | `bootstrap()`            | the process entrypoint                                             |
| `config/env/validation.ts` | `validateEnv()`          | handed to `ConfigModule.forRoot({ validate })`                     |
| `openapi/document.ts`      | `buildOpenApiDocument()` | takes an `INestApplication`; used by bootstrap and the spec script |
| `openapi/generate-spec.ts` | `generate()`             | a standalone script                                                |

That table is the whole list. Adding to it needs the same justification as adding a `process.env`
read: name the reason the DI container isn't available.

## Environment

`EnvService`, never `process.env`. Inject it and call `env.get('KEY')`:

```ts
constructor(private readonly env: EnvService) {}
// ...
const port = this.env.get('PORT'); // number, not string | undefined
```

`EnvService extends ConfigService<IEnvConfig, true>` — the `true` is a promise to the compiler
that validation guarantees presence, and it is only sound because every key in `validation.ts` is
required or has a `.default()`. Marking something the app depends on `.optional()` makes that
typing lie.

Adding a variable touches `.env.local.enc`, `.env.example`, and `envSchema` in
`src/config/env/validation.ts`. Never hand-write the env type — `IEnvConfig` is `z.infer` of the
schema.

`EnvModule` is a dynamic module — `EnvModule.forRoot()` in `app.module.ts`. `ConfigModule.forRoot`
reads and validates `process.env` when it is _called_, so calling it from inside `@Module({ imports })`
would snapshot the environment at import time, which no caller can control. The `forRoot` seam is
what lets a test set `process.env` and then build the module, and it keeps the module from having to
sniff `NODE_ENV` to decide whether to validate.

The only sanctioned `process.env` read is code that runs before the Nest container exists:
`src/instrument.ts`. It says so in a comment. A second needs the same justification.

## `src/instrument.ts` stays the first import

`main.ts` imports `./instrument` above everything, including `reflect-metadata`. Sentry patches
`http`, express, and the database drivers on require; anything loaded above that line is invisible
to tracing and profiling. `prettier-plugin-organize-imports` will not move it (it is separated by a
blank line and a comment) — don't move it by hand either.

## Structure

```
src/
  config/env/     ConfigModule + Zod schema, EnvService
  health/         health controller + service
  observability/  metrics interceptor
  prisma/         PrismaService (extends PrismaClient, lifecycle-bound)
  common/         cross-cutting only — guards, filters, decorators
  instrument.ts   Sentry init
  main.ts         bootstrap
```

Organise by feature, not by technical layer. A new feature is `src/<feature>/` holding its own
module, controller, service, and `__tests__/` — not a controller dropped into a global
`controllers/` folder.

## Controllers

Versioning is URI-based with `defaultVersion: '1'`, set in `main.ts`. Declare it the Comp way:

```ts
@Controller({ path: 'pings', version: '1' }) // ✅
@Controller('v1/pings')                       //  ❌
```

## Validation — `class-validator` at the HTTP boundary, Zod everywhere else

**Settled** (was an open question until `PingsController` landed). Request DTOs are
`class-validator` classes; the global `ValidationPipe` in `main.ts` (`whitelist`,
`forbidNonWhitelisted`, `transform`) is what enforces them.

The reason is OpenAPI, not preference: `@nestjs/swagger` builds the schema by reading decorator
metadata off DTO **classes**, and that schema is what generates the typed frontend client. A Zod
schema produces no such metadata without a bridging library, so choosing Zod here would mean
either hand-writing the OpenAPI spec or adding `nestjs-zod`. Neither is worth it for the one thing
Zod would buy — and it buys less than usual, because the DTO's inferred type is the class itself.

So the split is: **`class-validator` for anything that arrives over HTTP, Zod for everything
else** — env (`config/env/validation.ts`), and the web app's shared form/route validators.

Rules that follow:

- A DTO exists only when a controller signature demands one — a `@Body()`, a non-trivial `@Query()`
  or `@Param()`. Do not write DTOs ahead of the endpoint that needs them.
- Keep messages in step with the web app's Zod schema for the same payload, so a client-side and a
  server-side rejection read identically.
- `transform: true` is load-bearing — `@Transform` (e.g. trimming) does not run without it.
- Response DTOs describe the **wire format**, not the row (`createdAt` is a string). They exist to
  type the generated client, so give every operation an explicit `operationId`.

## Tests

Vitest, not Jest — one runner across the monorepo. `@nestjs/testing` works unchanged:

```
cd apps/api && bunx vitest run
```

Tests live in `__tests__/` next to the code. Every feature ships with them.

## Auth

There is none yet, and the root `CLAUDE.md` explains why. If the spec calls for it, mirror Comp's
pattern — `HybridAuthGuard` + `PermissionGuard` at the controller, `@RequirePermission` on every
endpoint, `@Public()` for webhooks — rather than inventing something local.
