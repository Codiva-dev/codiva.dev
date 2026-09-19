import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveStaffForApi } from '@/lib/ops/interview-file-access';
import {
  buildCalendarIcs,
  clampCalendarDuration,
  eventIcsUid,
  interviewIcsUid,
} from '@/lib/ops/calendar';
import { canAny } from '@/lib/ops/permissions';
import { isUuid } from '@/lib/ops/project-path';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get('kind')?.trim() ?? '';
  const id = url.searchParams.get('id')?.trim() ?? '';
  if (!isUuid(id) || (kind !== 'interview' && kind !== 'event')) {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sin acceso' }, { status: 401 });

  const staff = await getActiveStaffForApi(supabase, user.id);
  if (!staff) return NextResponse.json({ error: 'Sin acceso' }, { status: 401 });

  const admin = createAdminClient();

  if (kind === 'event') {
    const { data: event } = await admin
      .from('ops_calendar_events')
      .select('id, title, starts_at, duration_minutes, location, meeting_url')
      .eq('id', id)
      .maybeSingle();
    if (!event?.starts_at) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const ics = buildCalendarIcs({
      uid: eventIcsUid(event.id),
      title: event.title,
      startsAt: event.starts_at,
      durationMinutes: clampCalendarDuration(event.duration_minutes),
      location: event.location,
      url: event.meeting_url,
    });
    return icsResponse(ics, 'evento-codiva.ics');
  }

  const { data: round } = await admin
    .from('ops_job_interview_rounds')
    .select(
      'id, title, scheduled_at, duration_minutes, location, meeting_url, interviewer_id, application_id, ops_job_applications(full_name)'
    )
    .eq('id', id)
    .maybeSingle();
  if (!round?.scheduled_at) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const canRead =
    canAny(staff, ['team', 'careers_review']) || round.interviewer_id === staff.id;
  if (!canRead) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const application = Array.isArray(round.ops_job_applications)
    ? round.ops_job_applications[0]
    : round.ops_job_applications;
  const ics = buildCalendarIcs({
    uid: interviewIcsUid(round.id),
    title: `${round.title}${application?.full_name ? ` · ${application.full_name}` : ''}`,
    startsAt: round.scheduled_at,
    durationMinutes: clampCalendarDuration(round.duration_minutes),
    location: round.location,
    url: round.meeting_url,
  });
  return icsResponse(ics, 'entrevista-codiva.ics');
}

function icsResponse(ics: string, filename: string) {
  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
