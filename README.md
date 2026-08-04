# comp-trial

Full-stack app for the Comp AI work trial. Turborepo · Bun · Next.js 16 · Prisma 7 · Postgres (Neon)
· deployed on Vercel.

**Live:** _(pending — comp-trial.dltechnologies.co)_

Design decisions and the gaps I found in the spec live in [`DECISIONS.md`](./DECISIONS.md). That's
the document to read second.

## Layout

```
apps/web/          Next.js 16 App Router, React 19, Tailwind 4, shadcn/ui
  src/app/         routes + route handlers
  src/components/  UI
  src/server/
    services/      business logic — no transport concerns
    validators/    Zod schemas shared by forms and routes
packages/db/       Prisma schema + client singleton
```

## Setup

Requires Bun 1.3.4 (`mise install`).

```bash
bun install
cp .env.example packages/db/.env      # paste your Neon POOLED connection string
cp .env.example apps/web/.env.local   # same value
cd packages/db && bunx prisma migrate deploy && cd ../..
bun run dev
```

## Commands

| Command                                                   | What it does                           |
| --------------------------------------------------------- | -------------------------------------- |
| `bun run dev`                                             | All apps in watch mode                 |
| `bun run build`                                           | Turbo build (runs `db:generate` first) |
| `bun run typecheck`                                       | `tsc --noEmit` across the workspace    |
| `bun run test`                                            | Vitest                                 |
| `cd packages/db && bunx prisma migrate dev --name <name>` | New migration                          |

## Testing

Vitest, focused on the code where a bug is silent: the Zod validators shared between form and API,
and the service layer. UI rendering is checked by looking at it; input validation is not, so that's
where the tests are.

## Deployment

Vercel, root directory `apps/web`. Build command `cd ../.. && bun run build --filter=web`, install
command `bun install`. `DATABASE_URL` set for Production and Preview. Migrations are applied
manually with `prisma migrate deploy` — see DECISIONS.md for why they aren't in the build.

`/api/health` returns 503 if the database is unreachable, so a green deploy means a green database.
