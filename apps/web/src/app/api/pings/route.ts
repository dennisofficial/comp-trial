import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createPing, listPings } from '@/server/services/ping-service';
import { createPingSchema } from '@/server/validators/ping';

export const dynamic = 'force-dynamic';

export async function GET() {
  const pings = await listPings();

  return NextResponse.json({ data: pings });
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = createPingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const ping = await createPing({ input: parsed.data });

  return NextResponse.json({ data: ping }, { status: 201 });
}
