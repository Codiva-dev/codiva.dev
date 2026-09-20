import { NextResponse } from 'next/server';
import { ingestAuthorized, ingestVendorExpiry } from '@/lib/ops/saas-ingest';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!ingestAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    instanceKey?: string;
    slot?: string;
    expiresAt?: string | null;
    lastError?: string | null;
    checkedAt?: string;
  } | null;
  if (!body?.instanceKey || !body.slot) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  try {
    const result = await ingestVendorExpiry({
      instanceKey: body.instanceKey,
      slot: body.slot,
      expiresAt: body.expiresAt ?? null,
      lastError: body.lastError,
      checkedAt: body.checkedAt,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error';
    const status = message === 'instance' || message === 'slot' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
