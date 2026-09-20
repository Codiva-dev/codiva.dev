import { NextResponse } from 'next/server';
import { ingestAuthorized, snapshotForInstance } from '@/lib/ops/saas-ingest';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!ingestAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const instanceKey = new URL(request.url).searchParams.get('instanceKey')?.trim() || '';
  if (!instanceKey) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  try {
    const snap = await snapshotForInstance(instanceKey);
    if (!snap) return NextResponse.json({ error: 'instance' }, { status: 404 });
    return NextResponse.json(snap);
  } catch {
    return NextResponse.json({ error: 'error' }, { status: 500 });
  }
}
