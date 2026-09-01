import { NextResponse } from 'next/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { huntProgressForAttempt, postingRequiresHunt } from '@/lib/careers/hunt/progress';
import { notifyCandidateHuntNudge } from '@/lib/careers/hunt/notify-candidate';

export const runtime = 'nodejs';

const NUDGE_AFTER_MS = 48 * 60 * 60 * 1000;
const NUDGE_WINDOW_MS = 8 * 24 * 60 * 60 * 1000;

/**
 * Recordatorio de cacería. Proteger con CRON_SECRET.
 * GET /api/ops/cron/hunt-nudge
 * Header: Authorization: Bearer $CRON_SECRET
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: 'server_misconfigured' }, { status: 503 });
  }

  const now = Date.now();
  const oldest = new Date(now - NUDGE_WINDOW_MS).toISOString();
  const newest = new Date(now - NUDGE_AFTER_MS).toISOString();
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from('ops_job_assessment_attempts')
    .select('id, job_posting_id, catalog_key, full_name, email, completed_at')
    .eq('status', 'completed')
    .eq('passed', true)
    .is('hunt_nudge_sent_at', null)
    .gte('completed_at', oldest)
    .lte('completed_at', newest)
    .order('completed_at', { ascending: true })
    .limit(40);

  if (error) {
    console.error('cron hunt-nudge lookup', error);
    return NextResponse.json({ ok: false, error: 'lookup_failed' }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  for (const row of rows ?? []) {
    if (!(await postingRequiresHunt(row.job_posting_id, row.catalog_key))) {
      skipped += 1;
      continue;
    }
    const hunt = await huntProgressForAttempt({
      email: row.email,
      catalogKey: row.catalog_key,
      jobPostingId: row.job_posting_id,
    });
    if (hunt.ready) {
      await admin.from('ops_job_assessment_attempts').update({ hunt_nudge_sent_at: new Date().toISOString() }).eq('id', row.id);
      skipped += 1;
      continue;
    }
    await notifyCandidateHuntNudge({
      email: row.email,
      name: row.full_name,
      catalogKey: row.catalog_key,
      jobPostingId: row.job_posting_id,
    });
    await admin
      .from('ops_job_assessment_attempts')
      .update({ hunt_nudge_sent_at: new Date().toISOString() })
      .eq('id', row.id);
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, skipped, scanned: (rows ?? []).length });
}

export async function POST(request: Request) {
  return GET(request);
}
