export const ATTENTION_KINDS = [
  'charge_overdue',
  'license_locked',
  'license_grace',
  'vendor_jwt_due',
  'ticket_stale',
  'assignment_stuck',
  'release_qa',
  'interview_unscheduled',
  'sprint_no_hours',
  'lead_stale',
] as const;

export type AttentionKind = (typeof ATTENTION_KINDS)[number];

export type AttentionItem = {
  key: string;
  kind: AttentionKind;
  title: string;
  subtitle: string;
  href: string;
  rank: number;
  at: string;
};

export const ATTENTION_RANK: Record<AttentionKind, number> = {
  charge_overdue: 0,
  license_locked: 0,
  license_grace: 1,
  vendor_jwt_due: 1,
  ticket_stale: 2,
  assignment_stuck: 3,
  release_qa: 4,
  interview_unscheduled: 5,
  sprint_no_hours: 6,
  lead_stale: 7,
};

export const ATTENTION_LIMIT = 12;
export const ATTENTION_FULL_LIMIT = 80;
export const ATTENTION_BUCKETS = ['overdue', 'today', 'week', 'later'] as const;
export type AttentionBucket = (typeof ATTENTION_BUCKETS)[number];
const DAY_MS = 24 * 60 * 60 * 1000;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function attentionItemKey(kind: AttentionKind, id: string) {
  return `${kind}:${id}`;
}

export function isAttentionSnoozed(until: string | null | undefined, now = new Date()) {
  if (!until) return false;
  const t = Date.parse(until);
  return Number.isFinite(t) && t > now.getTime();
}

export function filterAttentionItems(
  items: AttentionItem[],
  snoozes: Array<{ item_key: string; until: string }>,
  now = new Date(),
  limit = ATTENTION_LIMIT
) {
  const blocked = new Set(
    snoozes.filter((row) => isAttentionSnoozed(row.until, now)).map((row) => row.item_key)
  );
  const sorted = items
    .filter((item) => !blocked.has(item.key))
    .sort((a, b) => a.rank - b.rank || b.at.localeCompare(a.at));
  if (limit <= 0) return sorted;
  return sorted.slice(0, limit);
}

export function attentionYmd(at: string | null | undefined) {
  const raw = String(at || '').trim();
  if (YMD_RE.test(raw)) return raw;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(parsed));
}

function addDaysToYmd(ymd: string, days: number) {
  const [year, month, day] = ymd.split('-').map(Number);
  if (!year || !month || !day) return ymd;
  const utc = new Date(Date.UTC(year, month - 1, day + days, 18, 0, 0));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(utc);
}

export function attentionBucket(at: string | null | undefined, now = new Date()): AttentionBucket {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const ymd = attentionYmd(at);
  if (!ymd) return 'later';
  if (ymd < today) return 'overdue';
  if (ymd === today) return 'today';
  if (ymd <= addDaysToYmd(today, 6)) return 'week';
  return 'later';
}

export function isStaleSince(iso: string | null | undefined, hours: number, now = new Date()) {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && now.getTime() - t >= hours * 60 * 60 * 1000;
}

export function isFinishedWorkProgress(progress: number | null | undefined) {
  return Number(progress) >= 100;
}

export function isStuckAssignment(opts: {
  status: string;
  urgency: string;
  statusEnteredAt: string | null | undefined;
  progressPct?: number | null;
  now?: Date;
}) {
  const now = opts.now ?? new Date();
  if (opts.status === 'done' || opts.status === 'archived' || opts.status === 'blocked') return false;
  if (isFinishedWorkProgress(opts.progressPct)) return false;
  if (opts.urgency === 'critical' || opts.urgency === 'high') {
    return isStaleSince(opts.statusEnteredAt, 24, now);
  }
  return false;
}

export function isUnscheduledInterviewAttention(opts: {
  roundStatus: string;
  scheduledAt: string | null | undefined;
  applicationStatus: string | null | undefined;
}) {
  if (opts.roundStatus !== 'planned' || opts.scheduledAt) return false;
  return opts.applicationStatus !== 'rejected' && opts.applicationStatus !== 'hired';
}

export function weekStartYmd(now = new Date(), timeZone = 'America/Mexico_City') {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(now);
  const delta: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const [year, month, day] = ymd.split('-').map(Number);
  const monday = new Date(Date.UTC(year, month - 1, day - (delta[weekday] ?? 0)));
  return monday.toISOString().slice(0, 10);
}

export function snoozeUntilIso(now = new Date(), hours = 24) {
  return new Date(now.getTime() + hours * DAY_MS).toISOString();
}
