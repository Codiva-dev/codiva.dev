import { OPS_CALENDAR_TZ } from '@/lib/ops/project-sprints';

export const CALENDAR_EVENT_KINDS = [
  'internal',
  'client',
  'release_qa',
  'quote_followup',
  'other',
] as const;

export type CalendarEventKind = (typeof CALENDAR_EVENT_KINDS)[number];

export const CALENDAR_DURATIONS = [30, 45, 60, 90, 120] as const;

export type CalendarReminderKind = '24h' | '1h';

const LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const HOUR_MS = 60 * 60 * 1000;

export function isCalendarEventKind(value: string): value is CalendarEventKind {
  return (CALENDAR_EVENT_KINDS as readonly string[]).includes(value);
}

export function clampCalendarDuration(value: unknown, fallback = 60): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  if (rounded < 15) return 15;
  if (rounded > 480) return 480;
  return rounded;
}

function tzParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Offset of `timeZone` at `date`: wallClockAsUtc - instant. */
export function timeZoneOffsetMs(date: Date, timeZone = OPS_CALENDAR_TZ): number {
  const wall = tzParts(date, timeZone);
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second);
  return asUtc - date.getTime();
}

/** Interprets `YYYY-MM-DDTHH:mm` as America/Mexico_City and returns UTC ISO. */
export function zonedLocalToUtcIso(local: string, timeZone = OPS_CALENDAR_TZ): string | null {
  const match = LOCAL_RE.exec(String(local || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = timeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset).toISOString();
}

export function utcIsoToZonedLocal(iso: string | null | undefined, timeZone = OPS_CALENDAR_TZ): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const wall = tzParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${wall.year}-${pad(wall.month)}-${pad(wall.day)}T${pad(wall.hour)}:${pad(wall.minute)}`;
}

export function addDaysYmd(ymd: string, days: number): string {
  const match = YMD_RE.exec(ymd);
  if (!match) return ymd;
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 18, 0, 0);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: OPS_CALENDAR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(utc));
}

/** Monday (YYYY-MM-DD, CDMX) of the week that contains `ymd` or today. */
export function mondayOfWeek(ymd?: string | null, now = new Date()): string {
  const raw = YMD_RE.test(String(ymd || '')) ? String(ymd) : new Intl.DateTimeFormat('en-CA', {
    timeZone: OPS_CALENDAR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const probe = new Date(`${raw}T18:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: OPS_CALENDAR_TZ,
    weekday: 'short',
  }).format(probe);
  const delta: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return addDaysYmd(raw, -(delta[weekday] ?? 0));
}

export function weekDays(mondayYmd: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDaysYmd(mondayYmd, i));
}

export function ymdInTimeZone(iso: string, timeZone = OPS_CALENDAR_TZ): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function parseCalendarScheduleFields(formData: FormData): {
  scheduled_at: string | null;
  duration_minutes: number;
  location: string | null;
  meeting_url: string | null;
} {
  const local = String(formData.get('scheduled_local') || '').trim();
  const scheduled_at = local ? zonedLocalToUtcIso(local) : null;
  if (local && !scheduled_at) {
    throw new Error('Fecha u hora inválida');
  }
  const location = String(formData.get('location') || '').trim().slice(0, 200) || null;
  const meetingRaw = String(formData.get('meeting_url') || '').trim().slice(0, 500);
  if (meetingRaw && !/^https?:\/\//i.test(meetingRaw)) {
    throw new Error('El enlace debe empezar con http:// o https://');
  }
  return {
    scheduled_at,
    duration_minutes: clampCalendarDuration(formData.get('duration_minutes')),
    location,
    meeting_url: meetingRaw || null,
  };
}

export function reminderDue(opts: {
  scheduledAt: string;
  sent24h: string | null | undefined;
  sent1h: string | null | undefined;
  now?: Date;
}): CalendarReminderKind | null {
  const start = new Date(opts.scheduledAt).getTime();
  const now = (opts.now ?? new Date()).getTime();
  if (!Number.isFinite(start) || now >= start) return null;
  const msToStart = start - now;
  if (msToStart <= HOUR_MS && !opts.sent1h) return '1h';
  if (msToStart <= 24 * HOUR_MS && !opts.sent24h) return '24h';
  return null;
}

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length) {
    chunks.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return chunks.join('\r\n');
}

function icsUtcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function buildCalendarIcs(opts: {
  uid: string;
  title: string;
  description?: string;
  startsAt: string;
  durationMinutes: number;
  location?: string | null;
  url?: string | null;
  stamp?: Date;
}): string {
  const start = new Date(opts.startsAt);
  const end = new Date(start.getTime() + clampCalendarDuration(opts.durationMinutes) * 60 * 1000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Codiva.dev//Ops//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${opts.uid}`,
    `DTSTAMP:${icsUtcStamp((opts.stamp ?? new Date()).toISOString())}`,
    `DTSTART:${icsUtcStamp(start.toISOString())}`,
    `DTEND:${icsUtcStamp(end.toISOString())}`,
    `SUMMARY:${icsEscape(opts.title)}`,
  ];
  if (opts.description) lines.push(`DESCRIPTION:${icsEscape(opts.description)}`);
  if (opts.location) lines.push(`LOCATION:${icsEscape(opts.location)}`);
  if (opts.url) lines.push(`URL:${opts.url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function interviewIcsUid(roundId: string): string {
  return `interview-${roundId}@ops.codiva.dev`;
}

export function eventIcsUid(eventId: string): string {
  return `event-${eventId}@ops.codiva.dev`;
}

export function scheduleChanged(previous: string | null | undefined, next: string | null): boolean {
  return (previous || null) !== next;
}
