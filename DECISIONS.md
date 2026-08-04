# Decisions & Open Questions

Written as I go, not reconstructed at the end.

## Scope

Nothing product-shaped yet — this entry covers the scaffold only. The spec arrives Wednesday
morning; scope gets written here the moment it does.

## Gaps in the spec

| Gap                             | Assumption I made | Why | Cost if I'm wrong |
| ------------------------------- | ----------------- | --- | ----------------- |
| _(pending — spec not yet read)_ |                   |     |                   |

## Architecture

### One Next.js app, not a split API

Comp AI runs a separate NestJS API. I didn't.

That split earns its keep at Comp because the API is a product surface — OpenAPI feeds the
Speakeasy SDK and the MCP server, so there are real second and third consumers. For a three-day
build with exactly one consumer, the split is pure overhead: two deploy targets, cross-origin
session cookies, and a serialization boundary I'd spend hours on and demo nothing with.

Instead the business logic is isolated under `apps/web/src/server/services`. Those functions take
plain values and return plain values — no `Request`, no `NextResponse`, no React. If a second
consumer appeared, each one lifts into a NestJS provider unchanged and the route handler becomes a
controller. The boundary exists; only the transport is collapsed.

### Prefixed CUIDs

Stolen directly from Comp's convention:

```sql
CREATE OR REPLACE FUNCTION generate_prefixed_cuid(prefix text)
RETURNS text AS $$
  SELECT prefix || '_' || replace(gen_random_uuid()::text, '-', '');
$$ LANGUAGE sql VOLATILE;
```

The reason is real and not cosmetic: passing a `usr_…` where a `png_…` belongs fails visibly at the
boundary instead of silently matching zero rows. Cost is one migration.

### Split schema files

`packages/db/prisma/schema/*.prisma`, one file per model, mirroring Comp's layout. There's only one
model today, which doesn't justify it on its own — but the layout is free now and annoying to
retrofit at model five.

### Hand-written initial migration

`prisma migrate dev` diffs the schema and would generate `CREATE TABLE ping` with a default calling
`generate_prefixed_cuid` — a function that doesn't exist yet, so the migration fails on apply. The
function has to be created in the same migration, ahead of the table, which means authoring
`20260804000000_init/migration.sql` by hand. Verified against the schema with `prisma migrate diff`
before the first deploy.

### Realtime: deferred, deliberately

The handoff gates realtime on the spec actually needing live updates. I haven't read the spec, so
there is nothing to justify it yet and I'm not scaffolding it speculatively. When the spec lands,
the ladder is: 5s polling → SSE + `LISTEN/NOTIFY` → a logical-replication package. I'll pick the
lowest rung that satisfies the requirement and record why here.

I maintain `@dltech/pgbase`, a logical-replication-backed Postgres realtime package with RLS. It is
at 1.0.0 with one published release. Introducing my own one-release-old dependency into someone
else's evaluation, on a three-day clock, is a risk with no upside I can't get from 30 lines of SSE.
It's listed on the prior-inventions schedule regardless.

### Migrations against production

`prisma migrate deploy` run deliberately, never `migrate dev`. Not wired into the Vercel build:
a build-time migration means a failed migration takes the deploy down with it, and Vercel builds
run concurrently on preview branches. Manual and boring beats automatic and surprising for a
three-day project.

### Infrastructure provisioned by hand

Vercel and Neon set up through their dashboards for speed. Beyond a prototype I'd move both to
Terraform — both have first-class providers — so environments are reproducible and env var changes
get reviewed in a PR instead of pasted into a console. Not worth the 1–2 hours here; it demos
nothing.

## What I'd do next

Ordered, with rough effort. (Pending spec.)

1. Read the spec, write the real data model, delete the `Ping` smoke-test model — ~1h
2. First real vertical slice, deployed — ~3h

## What I'd want to ask you

- _(batched Wednesday morning — see the runbook)_
