import { PingForm } from '@/components/ping-form';
import { PingList } from '@/components/ping-list';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/store/api';
import { preloadApiState } from '@/store/preload';
import { StoreProvider } from '@/store/store-provider';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const preloadedState = await preloadApiState((store) => {
    store.dispatch(api.endpoints.listPings.initiate());
  });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">comp-trial</h1>
        <p className="text-muted-foreground text-sm">
          Scaffold smoke test — reads and writes Postgres through the NestJS API, over a client
          generated from its OpenAPI spec. Replaced once the real spec lands.
        </p>
      </header>

      <StoreProvider preloadedState={preloadedState}>
        <Card>
          <CardHeader>
            <CardTitle>New ping</CardTitle>
            <CardDescription>
              Validated here by Zod, and again at the API by CreatePingDto.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PingForm />
          </CardContent>
        </Card>

        <PingList />
      </StoreProvider>
    </main>
  );
}
