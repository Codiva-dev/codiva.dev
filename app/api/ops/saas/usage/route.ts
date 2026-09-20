import { NextResponse } from 'next/server';
import { ingestAuthorized, ingestUsageEvent } from '@/lib/ops/saas-ingest';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!ingestAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => null)) as {
    instanceKey?: string;
    meter?: string;
    aggregateId?: string;
    occurredAt?: string;
  } | null;
  if (!body?.instanceKey || !body.meter || !body.aggregateId) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  try {
    const result = await ingestUsageEvent({
      instanceKey: body.instanceKey,
      meter: body.meter,
      aggregateId: body.aggregateId,
      occurredAt: body.occurredAt,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'error';
    const status = message === 'instance' || message === 'meter' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
