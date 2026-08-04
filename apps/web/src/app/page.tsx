import { PingForm } from '@/components/ping-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { listPings } from '@/server/services/ping-service';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const pings = await listPings();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">comp-trial</h1>
        <p className="text-muted-foreground text-sm">
          Scaffold smoke test — writes and reads Postgres through the service layer. Replaced once
          the real spec lands.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>New ping</CardTitle>
          <CardDescription>Validated by the same Zod schema the API route uses.</CardDescription>
        </CardHeader>
        <CardContent>
          <PingForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
          <CardDescription>
            {pings.length === 0 ? 'Nothing yet.' : `${pings.length} most recent`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y">
            {pings.map((ping) => (
              <li key={ping.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <span className="text-sm break-words">{ping.note}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {ping.id} · {ping.createdAt.toISOString()}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
