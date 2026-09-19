export const ATTENTION_KINDS = [
  'charge_overdue',
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
  ticket_stale: 1,
  assignment_stuck: 2,
  release_qa: 3,
  interview_unscheduled: 4,
  sprint_no_hours: 5,
  lead_stale: 6,
};

export const ATTENTION_LIMIT = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  now = new Date()
) {
  const blocked = new Set(
    snoozes.filter((row) => isAttentionSnoozed(row.until, now)).map((row) => row.item_key)
  );
  return items
    .filter((item) => !blocked.has(item.key))
    .sort((a, b) => a.rank - b.rank || b.at.localeCompare(a.at))
    .slice(0, ATTENTION_LIMIT);
}

export function isStaleSince(iso: string | null | undefined, hours: number, now = new Date()) {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && now.getTime() - t >= hours * 60 * 60 * 1000;
}

export function isStuckAssignment(opts: {
  status: string;
  urgency: string;
  statusEnteredAt: string | null | undefined;
  now?: Date;
}) {
  const now = opts.now ?? new Date();
  if (opts.status === 'done' || opts.status === 'archived') return false;
  if (opts.status === 'blocked') return isStaleSince(opts.statusEnteredAt, 8, now);
  if (opts.urgency === 'critical' || opts.urgency === 'high') {
    return isStaleSince(opts.statusEnteredAt, 24, now);
  }
  return false;
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
