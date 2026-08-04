# Project Rules

## Tooling

- **Package manager**: `bun` (never npm/yarn/pnpm)
- **Build**: `bun run build` (turbo). Filter: `bun run build --filter=web`
- **Typecheck**: `bun run typecheck`
- **Tests**: `cd apps/web && bunx vitest run`

## Code Style

- **Max 300 lines per file.** Split into focused modules if exceeded.
- **No `as any` casts.** Ever. Proper types, generics, or `unknown` + type guards.
- **No `@ts-ignore` / `@ts-expect-error`.** Fix the type.
- **Strict TypeScript.** Zod for runtime validation at every boundary.
- **Early returns** over nested conditionals.
- **Named parameters** for functions with 2+ arguments.
- **Event handlers** prefixed with `handle` (e.g. `handleSubmit`).

## Structure

    apps/web/src/
      app/            # App Router routes
      components/     # UI
      server/
        services/     # Business logic — NO transport concerns. Extractable to a Nest module.
        validators/   # Zod schemas shared by routes + forms
      lib/            # Clients, helpers
    packages/db/      # Prisma schema + client singleton

## Data

- Prisma + Postgres. IDs are prefixed CUIDs:
  `@default(dbgenerated("generate_prefixed_cuid('abc'::text)"))`
- Migrations: `cd packages/db && bunx prisma migrate dev --name <name>`
- Transactions for anything touching multiple records.
- Never trust client input — parse with Zod at the route boundary.

## Data Fetching

- Server Components fetch directly; pass results down as props.
- Route handlers under `app/api/` for mutations and multi-step work.
- Business logic lives in `src/server/services`, never inline in a route.

## Forms

- React Hook Form + Zod. Define the schema first, infer with `z.infer`.
- Never `useState` for form field values.
- Share the Zod schema between the form and the API route.

## Testing

- Vitest. Tests on business logic in `src/server/services` and any non-trivial pure function.
- Pure functions extracted specifically so they're testable — the I/O shell stays thin.

## Git

- Conventional commits: `<type>(<scope>): <description>` (imperative, lowercase)
- Never `--no-verify`. Never force-push. Never `git stash`.

## Definition of done

- Typechecks, tests pass, deployed to Vercel, and any spec gap resolved is recorded in DECISIONS.md.
