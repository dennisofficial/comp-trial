import { db } from '@repo/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Liveness + database reachability. Deploys are only "green" if this is.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'reachable' });
  } catch {
    return NextResponse.json({ status: 'degraded', database: 'unreachable' }, { status: 503 });
  }
}
