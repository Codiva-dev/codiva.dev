import { DEFAULT_LOCALE, type Locale } from '@/i18n/config';
import { tSync } from '@/i18n/translate';
import {
  buildCalendarIcs,
  clampCalendarDuration,
  eventIcsUid,
  interviewIcsUid,
  reminderDue,
  type CalendarReminderKind,
} from '@/lib/ops/calendar';
import { sendClientEmail } from '@/lib/ops/email';
import { templateCalendarEventMail, templateInterviewScheduled } from '@/lib/ops/email-templates';
import { notifyStaffPushSafe } from '@/lib/ops/push';
import { opsBaseUrl, interviewsApplicationUrl } from '@/lib/ops/host';
import { formatDateTime } from '@/lib/ops/labels';
import { createAdminClient } from '@/lib/supabase/admin';

type InterviewRoundMail = {
  id: string;
  title: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  location: string | null;
  meeting_url: string | null;
  interviewer_id: string | null;
  partner_member_id: string | null;
  application_id: string;
  status: string;
};

async function staffEmail(admin: ReturnType<typeof createAdminClient>, staffId: string | null) {
  if (!staffId) return null;
  const { data } = await admin.from('staff_profiles').select('full_name, email').eq('id', staffId).maybeSingle();
  if (!data?.email) return null;
  return { name: data.full_name || '', email: data.email };
}

function shouldPushReminder(kind?: CalendarReminderKind) {
  return !kind || kind === '1h';
}

async function partnerEmail(admin: ReturnType<typeof createAdminClient>, memberId: string | null) {
  if (!memberId) return null;
  const { data } = await admin
    .from('ops_recruiting_partner_members')
    .select('full_name, email, user_id')
    .eq('id', memberId)
    .maybeSingle();
  if (!data) return null;
  if (data.email) return { name: data.full_name || '', email: data.email };
  if (!data.user_id) return null;
  const { data: authUser } = await admin.auth.admin.getUserById(data.user_id);
  const email = authUser.user?.email;
  if (!email) return null;
  return { name: data.full_name || '', email };
}

function interviewIcs(opts: {
  roundId: string;
  title: string;
  candidateName: string;
  jobTitle: string;
  startsAt: string;
  durationMinutes: number;
  location: string | null;
  meetingUrl: string | null;
  href: string;
}) {
  return buildCalendarIcs({
    uid: interviewIcsUid(opts.roundId),
    title: `${opts.title} · ${opts.candidateName}`,
    description: `${opts.jobTitle}\n${opts.href}`,
    startsAt: opts.startsAt,
    durationMinutes: opts.durationMinutes,
    location: opts.location,
    url: opts.meetingUrl || opts.href,
  });
}

export async function notifyInterviewSchedule(opts: {
  roundId: string;
  reminder?: CalendarReminderKind;
  locale?: Locale;
}): Promise<number> {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const admin = createAdminClient();
  const { data: round } = await admin
    .from('ops_job_interview_rounds')
    .select(
      'id, title, scheduled_at, duration_minutes, location, meeting_url, interviewer_id, partner_member_id, application_id, status'
    )
    .eq('id', opts.roundId)
    .maybeSingle();
  const typed = round as InterviewRoundMail | null;
  if (!typed?.scheduled_at || typed.status === 'skipped') return 0;

  const { data: application } = await admin
    .from('ops_job_applications')
    .select('full_name, ops_job_postings(title)')
    .eq('id', typed.application_id)
    .maybeSingle();
  const posting = Array.isArray(application?.ops_job_postings)
    ? application?.ops_job_postings[0]
    : application?.ops_job_postings;
  const candidateName = application?.full_name || 'candidato';
  const jobTitle = posting?.title || 'vacante';
  const when = formatDateTime(typed.scheduled_at, locale);
  const durationMinutes = clampCalendarDuration(typed.duration_minutes);
  const staffRecipient = await staffEmail(admin, typed.interviewer_id);
  const partnerRecipient = await partnerEmail(admin, typed.partner_member_id);
  const recipients: Array<{ name: string; email: string; href: string }> = [];
  if (staffRecipient) {
    recipients.push({
      ...staffRecipient,
      href: `${opsBaseUrl()}/team?tab=bolsa&app=${typed.application_id}`,
    });
  }
  if (partnerRecipient) {
    recipients.push({
      ...partnerRecipient,
      href: interviewsApplicationUrl(typed.application_id),
    });
  }

  if (shouldPushReminder(opts.reminder) && typed.interviewer_id) {
    void notifyStaffPushSafe({
      staffIds: [typed.interviewer_id],
      payload: {
        title: opts.reminder ? 'Entrevista en 1 h' : 'Entrevista agendada',
        body: `${candidateName} · ${typed.title}`,
        href: `/team?tab=bolsa&app=${typed.application_id}`,
        tag: `interview-${typed.id}`,
      },
    });
  }

  if (!recipients.length) return 0;

  let sent = 0;
  for (const recipient of recipients) {
    const ics = interviewIcs({
      roundId: typed.id,
      title: typed.title,
      candidateName,
      jobTitle,
      startsAt: typed.scheduled_at,
      durationMinutes,
      location: typed.location,
      meetingUrl: typed.meeting_url,
      href: recipient.href,
    });
    const html = templateInterviewScheduled({
      recipientName: recipient.name,
      candidateName,
      jobTitle,
      when,
      durationMinutes,
      location: typed.location,
      meetingUrl: typed.meeting_url,
      href: recipient.href,
      reminder: opts.reminder,
      locale,
    });
    const subject = opts.reminder
      ? tSync(locale, 'email.interviewReminder.subject', { candidate: candidateName })
      : tSync(locale, 'email.interviewScheduled.subject', { candidate: candidateName });
    const result = await sendClientEmail({
      to: recipient.email,
      subject,
      html,
      attachments: [
        {
          filename: 'entrevista.ics',
          content: Buffer.from(ics, 'utf8'),
          contentType: 'text/calendar; charset=utf-8',
        },
      ],
    });
    if (result.ok) sent += 1;
  }
  return sent;
}

export async function notifyCalendarEventMail(opts: {
  eventId: string;
  reminder?: CalendarReminderKind;
  locale?: Locale;
}): Promise<number> {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const admin = createAdminClient();
  const { data: event } = await admin
    .from('ops_calendar_events')
    .select('id, title, starts_at, duration_minutes, location, meeting_url, assignee_id, created_by')
    .eq('id', opts.eventId)
    .maybeSingle();
  if (!event?.starts_at) return 0;

  const recipients = [
    await staffEmail(admin, event.assignee_id),
    event.assignee_id === event.created_by ? null : await staffEmail(admin, event.created_by),
  ].filter((row): row is { name: string; email: string } => Boolean(row));
  const unique = [...new Map(recipients.map((row) => [row.email.toLowerCase(), row])).values()];

  if (shouldPushReminder(opts.reminder)) {
    void notifyStaffPushSafe({
      staffIds: [event.assignee_id, event.created_by],
      payload: {
        title: opts.reminder ? 'Reunión en 1 h' : 'Reunión agendada',
        body: event.title,
        href: '/calendar',
        tag: `calendar-${event.id}`,
      },
    });
  }

  if (!unique.length) return 0;

  const href = `${opsBaseUrl()}/calendar`;
  const when = formatDateTime(event.starts_at, locale);
  const durationMinutes = clampCalendarDuration(event.duration_minutes);
  const ics = buildCalendarIcs({
    uid: eventIcsUid(event.id),
    title: event.title,
    startsAt: event.starts_at,
    durationMinutes,
    location: event.location,
    url: event.meeting_url || href,
  });
  let sent = 0;
  for (const recipient of unique) {
    const html = templateCalendarEventMail({
      recipientName: recipient.name,
      title: event.title,
      when,
      durationMinutes,
      location: event.location,
      meetingUrl: event.meeting_url,
      href,
      reminder: opts.reminder,
      locale,
    });
    const subject = opts.reminder
      ? tSync(locale, 'email.calendarReminder.subject', { title: event.title })
      : tSync(locale, 'email.calendarScheduled.subject', { title: event.title });
    const result = await sendClientEmail({
      to: recipient.email,
      subject,
      html,
      attachments: [
        {
          filename: 'evento.ics',
          content: Buffer.from(ics, 'utf8'),
          contentType: 'text/calendar; charset=utf-8',
        },
      ],
    });
    if (result.ok) sent += 1;
  }
  return sent;
}

export async function runCalendarReminders(now = new Date()): Promise<{ sent: number; scanned: number }> {
  const admin = createAdminClient();
  const from = now.toISOString();
  const until = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

  const [{ data: rounds }, { data: events }] = await Promise.all([
    admin
      .from('ops_job_interview_rounds')
      .select('id, scheduled_at, reminder_24h_sent_at, reminder_1h_sent_at, status')
      .eq('status', 'planned')
      .gte('scheduled_at', from)
      .lte('scheduled_at', until)
      .limit(80),
    admin
      .from('ops_calendar_events')
      .select('id, starts_at, reminder_24h_sent_at, reminder_1h_sent_at')
      .gte('starts_at', from)
      .lte('starts_at', until)
      .limit(80),
  ]);

  let sent = 0;
  const scanned = (rounds ?? []).length + (events ?? []).length;

  for (const round of rounds ?? []) {
    if (!round.scheduled_at) continue;
    const kind = reminderDue({
      scheduledAt: round.scheduled_at,
      sent24h: round.reminder_24h_sent_at,
      sent1h: round.reminder_1h_sent_at,
      now,
    });
    if (!kind) continue;
    const n = await notifyInterviewSchedule({ roundId: round.id, reminder: kind });
    sent += n;
    if (n > 0) {
      await admin
        .from('ops_job_interview_rounds')
        .update(kind === '1h' ? { reminder_1h_sent_at: now.toISOString() } : { reminder_24h_sent_at: now.toISOString() })
        .eq('id', round.id);
    }
  }

  for (const event of events ?? []) {
    const kind = reminderDue({
      scheduledAt: event.starts_at,
      sent24h: event.reminder_24h_sent_at,
      sent1h: event.reminder_1h_sent_at,
      now,
    });
    if (!kind) continue;
    const n = await notifyCalendarEventMail({ eventId: event.id, reminder: kind });
    sent += n;
    if (n > 0) {
      await admin
        .from('ops_calendar_events')
        .update(kind === '1h' ? { reminder_1h_sent_at: now.toISOString() } : { reminder_24h_sent_at: now.toISOString() })
        .eq('id', event.id);
    }
  }

  return { sent, scanned };
}
