'use server';

import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { getT } from '@/i18n/locale';
import { requireStaff } from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import {
  isCalendarEventKind,
  parseCalendarScheduleFields,
  scheduleChanged,
} from '@/lib/ops/calendar';
import { notifyCalendarEventMail } from '@/lib/ops/calendar-notify';
import { throwDb } from '@/lib/ops/throw-db';
import { isUuid } from '@/lib/ops/project-path';

function revalidateCalendar() {
  revalidatePath('/calendar');
}

export async function createCalendarEvent(formData: FormData) {
  const { user, supabase } = await requireStaff();
  const t = await getT();
  const title = String(formData.get('title') || '').trim().slice(0, 160);
  if (title.length < 1) throw new Error(t('ops.calendar.titleRequired'));
  const kind = String(formData.get('kind') || 'internal').trim();
  if (!isCalendarEventKind(kind)) throw new Error(t('ops.calendar.kindInvalid'));
  const schedule = parseCalendarScheduleFields(formData);
  if (!schedule.scheduled_at) throw new Error(t('ops.calendar.timeRequired'));
  const projectId = String(formData.get('project_id') || '').trim();
  const assigneeId = String(formData.get('assignee_id') || '').trim();

  const { data: row, error } = await supabase
    .from('ops_calendar_events')
    .insert({
      kind,
      title,
      starts_at: schedule.scheduled_at,
      duration_minutes: schedule.duration_minutes,
      location: schedule.location,
      meeting_url: schedule.meeting_url,
      project_id: isUuid(projectId) ? projectId : null,
      assignee_id: isUuid(assigneeId) ? assigneeId : null,
      created_by: user.id,
    })
    .select('id')
    .single();
  if (error || !row) throw await throwDb(error);

  after(() => notifyCalendarEventMail({ eventId: row.id }));
  await logActivity({
    entityType: 'calendar_event',
    entityId: row.id,
    action: 'calendar_event_created',
    metadata: { kind },
    actorId: user.id,
  });
  revalidateCalendar();
}

export async function updateCalendarEvent(eventId: string, formData: FormData) {
  const { user, supabase } = await requireStaff();
  const t = await getT();
  if (!isUuid(eventId)) throw new Error(t('ops.calendar.eventInvalid'));
  const { data: existing } = await supabase
    .from('ops_calendar_events')
    .select('id, starts_at')
    .eq('id', eventId)
    .maybeSingle();
  if (!existing) throw new Error(t('ops.calendar.eventNotFound'));

  const title = String(formData.get('title') || '').trim().slice(0, 160);
  if (title.length < 1) throw new Error(t('ops.calendar.titleRequired'));
  const kind = String(formData.get('kind') || 'internal').trim();
  if (!isCalendarEventKind(kind)) throw new Error(t('ops.calendar.kindInvalid'));
  const schedule = parseCalendarScheduleFields(formData);
  if (!schedule.scheduled_at) throw new Error(t('ops.calendar.timeRequired'));
  const projectId = String(formData.get('project_id') || '').trim();
  const assigneeId = String(formData.get('assignee_id') || '').trim();
  const timeChanged = scheduleChanged(existing.starts_at, schedule.scheduled_at);

  const { error } = await supabase
    .from('ops_calendar_events')
    .update({
      kind,
      title,
      starts_at: schedule.scheduled_at,
      duration_minutes: schedule.duration_minutes,
      location: schedule.location,
      meeting_url: schedule.meeting_url,
      project_id: isUuid(projectId) ? projectId : null,
      assignee_id: isUuid(assigneeId) ? assigneeId : null,
      ...(timeChanged ? { reminder_24h_sent_at: null, reminder_1h_sent_at: null } : {}),
    })
    .eq('id', eventId);
  if (error) throw await throwDb(error);

  if (timeChanged) after(() => notifyCalendarEventMail({ eventId }));
  await logActivity({
    entityType: 'calendar_event',
    entityId: eventId,
    action: 'calendar_event_updated',
    actorId: user.id,
  });
  revalidateCalendar();
}

export async function deleteCalendarEvent(eventId: string) {
  const { user, supabase } = await requireStaff();
  const t = await getT();
  if (!isUuid(eventId)) throw new Error(t('ops.calendar.eventInvalid'));
  const { error } = await supabase.from('ops_calendar_events').delete().eq('id', eventId);
  if (error) throw await throwDb(error);
  await logActivity({
    entityType: 'calendar_event',
    entityId: eventId,
    action: 'calendar_event_deleted',
    actorId: user.id,
  });
  revalidateCalendar();
}
