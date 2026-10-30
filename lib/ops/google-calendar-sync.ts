import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildGoogleCalendarEventBody,
  googleCalendarApi,
  isGoogleCalendarConfigured,
  refreshGoogleAccessToken,
  type GoogleCalendarEventInput,
} from '@/lib/ops/google-calendar';
import { clampCalendarDuration } from '@/lib/ops/calendar';
import { opsBaseUrl, interviewsApplicationUrl } from '@/lib/ops/host';

type Admin = ReturnType<typeof createAdminClient>;

type LinkRow = {
  staff_id: string;
  refresh_token: string;
  access_token: string | null;
  access_token_expires_at: string | null;
  calendar_id: string;
};

async function getLink(admin: Admin, staffId: string): Promise<LinkRow | null> {
  const { data } = await admin
    .from('ops_google_calendar_links')
    .select('staff_id, refresh_token, access_token, access_token_expires_at, calendar_id')
    .eq('staff_id', staffId)
    .maybeSingle();
  return data as LinkRow | null;
}

async function setLinkError(admin: Admin, staffId: string, message: string | null) {
  await admin
    .from('ops_google_calendar_links')
    .update({ last_error: message })
    .eq('staff_id', staffId);
}

async function accessTokenFor(admin: Admin, link: LinkRow): Promise<string | null> {
  const expiresAt = link.access_token_expires_at
    ? new Date(link.access_token_expires_at).getTime()
    : 0;
  if (link.access_token && expiresAt > Date.now() + 60_000) {
    return link.access_token;
  }
  const refreshed = await refreshGoogleAccessToken(link.refresh_token);
  if (!refreshed.access_token) {
    await setLinkError(admin, link.staff_id, refreshed.error_description || refreshed.error || 'refresh_failed');
    return null;
  }
  const expiresIn = Number(refreshed.expires_in) || 3600;
  await admin
    .from('ops_google_calendar_links')
    .update({
      access_token: refreshed.access_token,
      access_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      last_error: null,
    })
    .eq('staff_id', link.staff_id);
  return refreshed.access_token;
}

async function upsertSync(
  admin: Admin,
  staffId: string,
  sourceKind: 'event' | 'interview',
  sourceId: string,
  googleEventId: string,
  calendarId: string
) {
  await admin.from('ops_google_calendar_sync').upsert(
    {
      staff_id: staffId,
      source_kind: sourceKind,
      source_id: sourceId,
      google_event_id: googleEventId,
      google_calendar_id: calendarId,
    },
    { onConflict: 'staff_id,source_kind,source_id' }
  );
}

async function getSync(
  admin: Admin,
  staffId: string,
  sourceKind: 'event' | 'interview',
  sourceId: string
) {
  const { data } = await admin
    .from('ops_google_calendar_sync')
    .select('google_event_id, google_calendar_id')
    .eq('staff_id', staffId)
    .eq('source_kind', sourceKind)
    .eq('source_id', sourceId)
    .maybeSingle();
  return data as { google_event_id: string; google_calendar_id: string } | null;
}

async function deleteSync(
  admin: Admin,
  staffId: string,
  sourceKind: 'event' | 'interview',
  sourceId: string
) {
  await admin
    .from('ops_google_calendar_sync')
    .delete()
    .eq('staff_id', staffId)
    .eq('source_kind', sourceKind)
    .eq('source_id', sourceId);
}

async function pushEventToStaff(
  admin: Admin,
  staffId: string,
  sourceKind: 'event' | 'interview',
  sourceId: string,
  input: GoogleCalendarEventInput
) {
  const link = await getLink(admin, staffId);
  if (!link) return;
  const accessToken = await accessTokenFor(admin, link);
  if (!accessToken) return;

  const calendarId = encodeURIComponent(link.calendar_id || 'primary');
  const body = buildGoogleCalendarEventBody(input);
  const existing = await getSync(admin, staffId, sourceKind, sourceId);

  if (existing?.google_event_id) {
    const patched = await googleCalendarApi<{ id?: string }>({
      accessToken,
      method: 'PATCH',
      path: `/calendars/${calendarId}/events/${encodeURIComponent(existing.google_event_id)}`,
      body,
    });
    if (patched.ok) {
      await setLinkError(admin, staffId, null);
      return;
    }
    if (patched.status !== 404) {
      await setLinkError(admin, staffId, patched.error);
      return;
    }
  }

  const created = await googleCalendarApi<{ id?: string }>({
    accessToken,
    method: 'POST',
    path: `/calendars/${calendarId}/events`,
    body,
  });
  if (!created.ok || !created.data?.id) {
    await setLinkError(admin, staffId, created.ok ? 'missing_event_id' : created.error);
    return;
  }
  await upsertSync(admin, staffId, sourceKind, sourceId, created.data.id, link.calendar_id || 'primary');
  await setLinkError(admin, staffId, null);
}

async function deleteEventForStaff(
  admin: Admin,
  staffId: string,
  sourceKind: 'event' | 'interview',
  sourceId: string
) {
  const link = await getLink(admin, staffId);
  const existing = await getSync(admin, staffId, sourceKind, sourceId);
  if (!existing) return;

  if (link) {
    const accessToken = await accessTokenFor(admin, link);
    if (accessToken) {
      const calendarId = encodeURIComponent(existing.google_calendar_id || link.calendar_id || 'primary');
      const deleted = await googleCalendarApi<unknown>({
        accessToken,
        method: 'DELETE',
        path: `/calendars/${calendarId}/events/${encodeURIComponent(existing.google_event_id)}`,
      });
      if (!deleted.ok && deleted.status !== 404) {
        await setLinkError(admin, staffId, deleted.error);
      }
    }
  }
  await deleteSync(admin, staffId, sourceKind, sourceId);
}

function uniqueStaffIds(...ids: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Sync an ops calendar event to linked Google calendars (assignee + creator). */
export async function syncOpsCalendarEventToGoogle(eventId: string): Promise<void> {
  if (!isGoogleCalendarConfigured()) return;
  const admin = createAdminClient();
  const { data: event } = await admin
    .from('ops_calendar_events')
    .select('id, title, starts_at, duration_minutes, location, meeting_url, assignee_id, created_by, kind')
    .eq('id', eventId)
    .maybeSingle();
  if (!event?.starts_at) return;

  const targets = uniqueStaffIds(event.assignee_id, event.created_by);
  if (!targets.length) return;

  const input: GoogleCalendarEventInput = {
    title: event.title,
    description: `Codiva Ops · ${event.kind}\n${opsBaseUrl()}/calendar`,
    startsAt: event.starts_at,
    durationMinutes: clampCalendarDuration(event.duration_minutes),
    location: event.location,
    meetingUrl: event.meeting_url,
  };

  for (const staffId of targets) {
    await pushEventToStaff(admin, staffId, 'event', eventId, input).catch((err) => {
      console.error('google calendar sync event', eventId, staffId, err);
    });
  }
}

export async function deleteOpsCalendarEventFromGoogle(eventId: string): Promise<void> {
  if (!isGoogleCalendarConfigured()) return;
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from('ops_google_calendar_sync')
    .select('staff_id')
    .eq('source_kind', 'event')
    .eq('source_id', eventId);
  for (const row of rows ?? []) {
    await deleteEventForStaff(admin, row.staff_id, 'event', eventId).catch((err) => {
      console.error('google calendar delete event', eventId, row.staff_id, err);
    });
  }
}

/** Sync a scheduled interview round to the interviewer's Google Calendar. */
export async function syncInterviewRoundToGoogle(roundId: string): Promise<void> {
  if (!isGoogleCalendarConfigured()) return;
  const admin = createAdminClient();
  const { data: round } = await admin
    .from('ops_job_interview_rounds')
    .select(
      'id, title, scheduled_at, duration_minutes, location, meeting_url, interviewer_id, application_id, status'
    )
    .eq('id', roundId)
    .maybeSingle();
  if (!round) return;

  if (!round.scheduled_at || round.status === 'skipped' || !round.interviewer_id) {
    const { data: rows } = await admin
      .from('ops_google_calendar_sync')
      .select('staff_id')
      .eq('source_kind', 'interview')
      .eq('source_id', roundId);
    for (const row of rows ?? []) {
      await deleteEventForStaff(admin, row.staff_id, 'interview', roundId).catch(() => undefined);
    }
    return;
  }

  const input: GoogleCalendarEventInput = {
    title: round.title,
    description: `Entrevista Codiva\n${interviewsApplicationUrl(round.application_id)}`,
    startsAt: round.scheduled_at,
    durationMinutes: clampCalendarDuration(round.duration_minutes ?? 60),
    location: round.location,
    meetingUrl: round.meeting_url,
  };

  await pushEventToStaff(admin, round.interviewer_id, 'interview', roundId, input).catch((err) => {
    console.error('google calendar sync interview', roundId, err);
  });
}

export async function deleteInterviewRoundFromGoogle(roundId: string): Promise<void> {
  if (!isGoogleCalendarConfigured()) return;
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from('ops_google_calendar_sync')
    .select('staff_id')
    .eq('source_kind', 'interview')
    .eq('source_id', roundId);
  for (const row of rows ?? []) {
    await deleteEventForStaff(admin, row.staff_id, 'interview', roundId).catch((err) => {
      console.error('google calendar delete interview', roundId, row.staff_id, err);
    });
  }
}

export async function getGoogleCalendarLinkStatus(staffId: string) {
  if (!isGoogleCalendarConfigured()) {
    return { configured: false as const, linked: false as const };
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from('ops_google_calendar_links')
    .select('google_email, linked_at, last_error')
    .eq('staff_id', staffId)
    .maybeSingle();
  if (!data) return { configured: true as const, linked: false as const };
  return {
    configured: true as const,
    linked: true as const,
    googleEmail: data.google_email as string,
    linkedAt: data.linked_at as string,
    lastError: (data.last_error as string | null) || null,
  };
}
