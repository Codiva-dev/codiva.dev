import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { loadActiveInterviewMember } from '@/lib/ops/auth';
import { getActiveStaffForApi } from '@/lib/ops/interview-file-access';
import { partnerMayOperateRound } from '@/lib/ops/interview-partner';
import { canAny } from '@/lib/ops/permissions';
import {
  buildCalendarIcs,
  clampCalendarDuration,
  interviewIcsUid,
} from '@/lib/ops/calendar';
import { isUuid } from '@/lib/ops/project-path';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const roundId = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!isUuid(roundId)) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sin acceso' }, { status: 401 });

  const admin = createAdminClient();
  const { data: round } = await admin
    .from('ops_job_interview_rounds')
    .select(
      'id, title, kind, scheduled_at, duration_minutes, location, meeting_url, partner_member_id, application_id, ops_job_applications(id, full_name, job_posting_id)'
    )
    .eq('id', roundId)
    .maybeSingle();
  if (!round?.scheduled_at) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const staff = await getActiveStaffForApi(supabase, user.id);
  const loaded = await loadActiveInterviewMember(supabase, user.id);
  const application = Array.isArray(round.ops_job_applications)
    ? round.ops_job_applications[0]
    : round.ops_job_applications;

  let allowed = Boolean(staff && canAny(staff, ['team', 'careers_review']));
  if (!allowed && loaded?.member && application) {
    const { data: assignments } = await admin
      .from('ops_interview_assignments')
      .select('round_id, application_id, job_posting_id')
      .eq('member_id', loaded.member.id);
    allowed = partnerMayOperateRound(round, {
      memberId: loaded.member.id,
      assignments: assignments ?? [],
      application,
    });
  }
  if (!allowed) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const ics = buildCalendarIcs({
    uid: interviewIcsUid(round.id),
    title: `${round.title}${application?.full_name ? ` · ${application.full_name}` : ''}`,
    startsAt: round.scheduled_at,
    durationMinutes: clampCalendarDuration(round.duration_minutes),
    location: round.location,
    url: round.meeting_url,
  });
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="entrevista-codiva.ics"',
      'Cache-Control': 'no-store',
    },
  });
}
