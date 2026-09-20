import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/ops/timing-safe-bearer';
import { isSupabaseConfigured } from '@/lib/supabase/admin';
import { runCalendarReminders } from '@/lib/ops/calendar-notify';

export const runtime = 'nodejs';

/**
 * Recordatorio de agenda (24 h y 1 h). Proteger con CRON_SECRET.
 * GET /api/ops/cron/calendar-nudge
 * Header: Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'server_misconfigured' }, { status: 503 });
  }

  try {
    const result = await runCalendarReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('cron calendar-nudge', error);
    return NextResponse.json({ ok: false, error: 'nudge_failed' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
