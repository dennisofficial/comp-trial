import { db } from '@repo/db';

import type { CreatePingInput, Ping } from '@/server/validators/ping';

/**
 * Business logic for pings. Knows nothing about HTTP, Next.js, or React —
 * it takes plain values and returns plain values, so it would move into a
 * NestJS provider unchanged if a second consumer ever needed it.
 */

const DEFAULT_LIMIT = 20;

export async function listPings({ limit = DEFAULT_LIMIT }: { limit?: number } = {}): Promise<
  Ping[]
> {
  const rows = await db.ping.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, note: true, createdAt: true },
  });

  return rows;
}

export async function createPing({ input }: { input: CreatePingInput }): Promise<Ping> {
  const row = await db.ping.create({
    data: { note: input.note },
    select: { id: true, note: true, createdAt: true },
  });

  return row;
}
