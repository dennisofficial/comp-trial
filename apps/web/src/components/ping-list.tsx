'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useListPingsQuery, type PingListResponseDto } from '@/store/api';

export function PingList() {
  const { data, isError, refetch } = useListPingsQuery();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent</CardTitle>
        <CardDescription>{summarise({ data, isError })}</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-sm underline underline-offset-4"
          >
            Try again
          </button>
        ) : (
          <ul className="flex flex-col divide-y">
            {(data?.data ?? []).map((ping) => (
              <li key={ping.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <span className="text-sm wrap-break-word">{ping.note}</span>
                <span className="text-muted-foreground font-mono text-xs">
                  {ping.id} · {ping.createdAt}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function summarise({
  data,
  isError,
}: {
  data: PingListResponseDto | undefined;
  isError: boolean;
}): string {
  if (isError) return 'Could not reach the API.';
  if (!data) return 'Loading…';
  if (data.data.length === 0) return 'Nothing yet.';

  return `${data.data.length} most recent`;
}
