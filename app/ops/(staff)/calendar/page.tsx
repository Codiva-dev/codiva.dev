import type { ReactNode } from 'react';
import Link from 'next/link';
import OpsPageHeader from '@/components/ops/OpsPageHeader';
import ToastForm from '@/components/ops/ToastForm';
import { requireStaff } from '@/lib/ops/auth';
import { can } from '@/lib/ops/permissions';
import { getT, type Translator } from '@/i18n/locale';
import { labelsFor } from '@/lib/ops/labels';
import { opsCalendarDate } from '@/lib/ops/project-sprints';
import {
  CALENDAR_DURATIONS,
  CALENDAR_EVENT_KINDS,
  addDaysYmd,
  mondayOfWeek,
  utcIsoToZonedLocal,
  weekDays,
  ymdInTimeZone,
  zonedLocalToUtcIso,
} from '@/lib/ops/calendar';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  updateCalendarEvent,
} from '@/lib/ops/calendar-actions';
import { isJobInterviewKind } from '@/lib/ops/careers';

type InterviewJoin = {
  full_name?: string | null;
  ops_job_postings?: { title?: string | null } | { title?: string | null }[] | null;
};

function postingTitle(join: InterviewJoin | InterviewJoin[] | null | undefined) {
  const app = Array.isArray(join) ? join[0] : join;
  const posting = Array.isArray(app?.ops_job_postings) ? app?.ops_job_postings[0] : app?.ops_job_postings;
  return posting?.title || null;
}

function candidateName(join: InterviewJoin | InterviewJoin[] | null | undefined) {
  const app = Array.isArray(join) ? join[0] : join;
  return app?.full_name || null;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: weekParam } = await searchParams;
  const { supabase, staff } = await requireStaff();
  const t = await getT();
  const { formatDate, formatDateTime } = labelsFor(t.locale);
  const canCareers = can(staff, 'careers_review');
  const monday = mondayOfWeek(weekParam);
  const days = weekDays(monday);
  const from = zonedLocalToUtcIso(`${monday}T00:00`) ?? `${monday}T06:00:00.000Z`;
  const until =
    zonedLocalToUtcIso(`${addDaysYmd(monday, 7)}T00:00`) ?? `${addDaysYmd(monday, 7)}T06:00:00.000Z`;
  const today = opsCalendarDate();

  const [{ data: events }, { data: rounds }, { data: projects }, { data: staffRows }, { data: unscheduled }] =
    await Promise.all([
      supabase
        .from('ops_calendar_events')
        .select(
          'id, kind, title, starts_at, duration_minutes, location, meeting_url, project_id, assignee_id, created_by'
        )
        .gte('starts_at', from)
        .lt('starts_at', until)
        .order('starts_at', { ascending: true }),
      canCareers
        ? supabase
            .from('ops_job_interview_rounds')
            .select(
              'id, title, kind, status, scheduled_at, duration_minutes, location, meeting_url, application_id, ops_job_applications(full_name, ops_job_postings(title))'
            )
            .neq('status', 'skipped')
            .gte('scheduled_at', from)
            .lt('scheduled_at', until)
            .order('scheduled_at', { ascending: true })
        : Promise.resolve({ data: [] as never[] }),
      supabase.from('projects').select('id, name').neq('status', 'archived').order('name'),
      supabase.from('staff_profiles').select('id, full_name').eq('active', true).order('full_name'),
      canCareers
        ? supabase
            .from('ops_job_interview_rounds')
            .select('id, title, application_id, ops_job_applications(full_name)')
            .eq('status', 'planned')
            .is('scheduled_at', null)
            .order('created_at', { ascending: false })
            .limit(12)
        : Promise.resolve({ data: [] as never[] }),
    ]);

  const staffName = new Map((staffRows ?? []).map((row) => [row.id, row.full_name]));
  const projectName = new Map((projects ?? []).map((row) => [row.id, row.name]));

  type DayItem = {
    id: string;
    sort: string;
    time: string;
    title: string;
    meta: string;
    href: string;
    icsHref: string;
    edit?: ReactNode;
  };

  const byDay = new Map<string, DayItem[]>();
  for (const day of days) byDay.set(day, []);

  for (const event of events ?? []) {
    const day = ymdInTimeZone(event.starts_at);
    if (!day || !byDay.has(day)) continue;
    const assignee = event.assignee_id ? staffName.get(event.assignee_id) : null;
    const project = event.project_id ? projectName.get(event.project_id) : null;
    byDay.get(day)!.push({
      id: event.id,
      sort: event.starts_at,
      time: formatDateTime(event.starts_at),
      title: event.title,
      meta: [
        t(`ops.calendar.kind.${event.kind}` as const),
        project,
        assignee,
        event.location,
      ]
        .filter(Boolean)
        .join(' · '),
      href: '/calendar',
      icsHref: `/api/ops/calendar/ics?kind=event&id=${event.id}`,
      edit: (
        <EventEditor
          event={event}
          projects={projects ?? []}
          staffRows={staffRows ?? []}
          t={t}
        />
      ),
    });
  }

  for (const round of rounds ?? []) {
    if (!round.scheduled_at) continue;
    const day = ymdInTimeZone(round.scheduled_at);
    if (!day || !byDay.has(day)) continue;
    const app = round.ops_job_applications as InterviewJoin | InterviewJoin[] | null;
    const name = candidateName(app);
    const job = postingTitle(app);
    byDay.get(day)!.push({
      id: round.id,
      sort: round.scheduled_at,
      time: formatDateTime(round.scheduled_at),
      title: `${round.title}${name ? ` · ${name}` : ''}`,
      meta: [
        isJobInterviewKind(round.kind) ? t(`ops.careers.interviewKind.${round.kind}` as const) : round.kind,
        job,
        round.location,
      ]
        .filter(Boolean)
        .join(' · '),
      href: `/team?tab=bolsa&app=${round.application_id}`,
      icsHref: `/api/ops/calendar/ics?kind=interview&id=${round.id}`,
    });
  }

  for (const list of byDay.values()) {
    list.sort((a, b) => a.sort.localeCompare(b.sort));
  }

  const prevWeek = addDaysYmd(monday, -7);
  const nextWeek = addDaysYmd(monday, 7);
  const weekLabel = `${formatDate(`${monday}T18:00:00.000Z`)} – ${formatDate(`${days[6]}T18:00:00.000Z`)}`;

  return (
    <div>
      <OpsPageHeader
        title={t('ops.calendar.title')}
        description={t('ops.calendar.description')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/calendar?week=${prevWeek}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              {t('ops.calendar.prevWeek')}
            </Link>
            <Link
              href="/calendar"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              {t('ops.calendar.thisWeek')}
            </Link>
            <Link
              href={`/calendar?week=${nextWeek}`}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              {t('ops.calendar.nextWeek')}
            </Link>
          </div>
        }
      />
      <p className="mb-6 text-sm text-zinc-600">{weekLabel}</p>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">{t('ops.calendar.addEvent')}</h2>
        <ToastForm
          success={t('ops.calendar.eventCreated')}
          action={createCalendarEvent}
          className="mt-3 grid gap-2 sm:grid-cols-2"
        >
          <input
            name="title"
            required
            maxLength={160}
            placeholder={t('ops.calendar.titlePlaceholder')}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
          />
          <select name="kind" defaultValue="internal" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            {CALENDAR_EVENT_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {t(`ops.calendar.kind.${kind}`)}
              </option>
            ))}
          </select>
          <select name="assignee_id" defaultValue="" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            <option value="">{t('ops.calendar.unassigned')}</option>
            {(staffRows ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.full_name}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            name="scheduled_local"
            required
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <select name="duration_minutes" defaultValue="60" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
            {CALENDAR_DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {t('ops.calendar.minutes', { n: String(minutes) })}
              </option>
            ))}
          </select>
          <select name="project_id" defaultValue="" className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2">
            <option value="">{t('ops.calendar.noProject')}</option>
            {(projects ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <input
            name="location"
            maxLength={200}
            placeholder={t('ops.careers.interviewLocationPlaceholder')}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <input
            name="meeting_url"
            type="url"
            placeholder="https://"
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm text-white sm:col-span-2"
          >
            {t('ops.calendar.saveEvent')}
          </button>
        </ToastForm>
      </section>

      <ol className="space-y-4">
        {days.map((day) => {
          const items = byDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <li
              key={day}
              className={`rounded-2xl border p-4 ${
                isToday ? 'border-codiva-primary/40 bg-teal-50/40' : 'border-zinc-200 bg-white'
              }`}
            >
              <h2 className="text-sm font-semibold text-zinc-900">
                {formatDate(`${day}T18:00:00.000Z`)}
                {isToday ? ` · ${t('ops.calendar.today')}` : ''}
              </h2>
              {items.length ? (
                <ul className="mt-3 space-y-3">
                  {items.map((item) => (
                    <li key={item.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2">
                      <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                      <p className="text-xs text-zinc-500">
                        {item.time}
                        {item.meta ? ` · ${item.meta}` : ''}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-3 text-xs">
                        <Link href={item.href} className="text-codiva-primary hover:underline">
                          {t('ops.calendar.open')}
                        </Link>
                        <a href={item.icsHref} className="text-codiva-primary hover:underline">
                          {t('ops.calendar.addToCalendar')}
                        </a>
                      </p>
                      {item.edit}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">{t('ops.calendar.emptyDay')}</p>
              )}
            </li>
          );
        })}
      </ol>

      {canCareers && (unscheduled ?? []).length ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-zinc-900">{t('ops.calendar.unscheduled')}</h2>
          <p className="mt-1 text-sm text-zinc-500">{t('ops.calendar.unscheduledHint')}</p>
          <ul className="mt-3 space-y-2">
            {(unscheduled ?? []).map((row) => {
              const name = candidateName(row.ops_job_applications as InterviewJoin | InterviewJoin[] | null);
              return (
                <li key={row.id} className="text-sm text-zinc-700">
                  <Link href={`/team?tab=bolsa&app=${row.application_id}`} className="text-codiva-primary hover:underline">
                    {row.title}
                    {name ? ` · ${name}` : ''}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function EventEditor({
  event,
  projects,
  staffRows,
  t,
}: {
  event: {
    id: string;
    kind: string;
    title: string;
    starts_at: string;
    duration_minutes: number;
    location: string | null;
    meeting_url: string | null;
    project_id: string | null;
    assignee_id: string | null;
  };
  projects: { id: string; name: string }[];
  staffRows: { id: string; full_name: string }[];
  t: Translator;
}) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-800">
        {t('ops.calendar.editEvent')}
      </summary>
      <ToastForm
        success={t('ops.calendar.eventSaved')}
        action={async (fd) => {
          'use server';
          await updateCalendarEvent(event.id, fd);
        }}
        className="mt-2 grid gap-2 sm:grid-cols-2"
      >
        <input
          name="title"
          required
          maxLength={160}
          defaultValue={event.title}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
        />
        <select name="kind" defaultValue={event.kind} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
          {CALENDAR_EVENT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`ops.calendar.kind.${kind}`)}
            </option>
          ))}
        </select>
        <select
          name="assignee_id"
          defaultValue={event.assignee_id || ''}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        >
          <option value="">{t('ops.calendar.unassigned')}</option>
          {staffRows.map((row) => (
            <option key={row.id} value={row.id}>
              {row.full_name}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          name="scheduled_local"
          required
          defaultValue={utcIsoToZonedLocal(event.starts_at)}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <select
          name="duration_minutes"
          defaultValue={String(event.duration_minutes || 60)}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        >
          {CALENDAR_DURATIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {t('ops.calendar.minutes', { n: String(minutes) })}
            </option>
          ))}
        </select>
        <select
          name="project_id"
          defaultValue={event.project_id || ''}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
        >
          <option value="">{t('ops.calendar.noProject')}</option>
          {projects.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <input
          name="location"
          defaultValue={event.location || ''}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <input
          name="meeting_url"
          type="url"
          defaultValue={event.meeting_url || ''}
          className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        />
        <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50">
          {t('ops.team.save')}
        </button>
      </ToastForm>
      <ToastForm
        success={t('ops.calendar.eventDeleted')}
        confirmMessage={t('ops.calendar.deleteConfirm')}
        confirmLabel={t('ops.calendar.deleteEvent')}
        action={async () => {
          'use server';
          await deleteCalendarEvent(event.id);
        }}
        className="mt-2"
      >
        <button type="submit" className="text-xs text-red-700 hover:underline">
          {t('ops.calendar.deleteEvent')}
        </button>
      </ToastForm>
    </details>
  );
}
