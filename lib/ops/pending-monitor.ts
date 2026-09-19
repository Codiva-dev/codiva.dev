import {
  ATTENTION_BUCKETS,
  attentionBucket,
  attentionYmd,
  type AttentionBucket,
  type AttentionItem,
  type AttentionKind,
} from '@/lib/ops/attention';

export const MONITOR_ACTION_KINDS = ['mention', 'edit_request'] as const;
export type MonitorActionKind = (typeof MONITOR_ACTION_KINDS)[number];
export type MonitorKind = AttentionKind | 'my_assignment' | MonitorActionKind;

export type PendingMonitorItem = {
  key: string;
  kind: MonitorKind;
  title: string;
  subtitle: string;
  href: string;
  at: string;
  snoozeKey?: string;
  mentionId?: string;
};

export type MonitorAssignment = {
  id: string;
  title: string;
  subtitle: string;
  dueAt: string | null;
};

export type MonitorMention = {
  id: string;
  assignmentId: string;
  title: string;
  subtitle: string;
  at: string;
};

export type MonitorEditRequest = {
  id: string;
  assignmentId: string;
  title: string;
  subtitle: string;
  at: string;
};

export function buildPendingMonitor(input: {
  attention: AttentionItem[];
  assignments: MonitorAssignment[];
  mentions: MonitorMention[];
  editRequests: MonitorEditRequest[];
}): { actions: PendingMonitorItem[]; timeline: PendingMonitorItem[] } {
  const stuckIds = new Set(
    input.attention
      .filter((row) => row.kind === 'assignment_stuck')
      .map((row) => row.key.slice(`${row.kind}:`.length))
  );

  const actions: PendingMonitorItem[] = [
    ...input.mentions.map((row) => ({
      key: `mention:${row.id}`,
      kind: 'mention' as const,
      title: row.title,
      subtitle: row.subtitle,
      href: `/asignaciones?id=${row.assignmentId}`,
      at: row.at,
      mentionId: row.id,
    })),
    ...input.editRequests.map((row) => ({
      key: `edit_request:${row.id}`,
      kind: 'edit_request' as const,
      title: row.title,
      subtitle: row.subtitle,
      href: `/asignaciones?id=${row.assignmentId}`,
      at: row.at,
    })),
  ];

  const timeline: PendingMonitorItem[] = [
    ...input.attention.map((row) => ({
      key: row.key,
      kind: row.kind,
      title: row.title,
      subtitle: row.subtitle,
      href: row.href,
      at: row.at,
      snoozeKey: row.key,
    })),
    ...input.assignments
      .filter((row) => !stuckIds.has(row.id))
      .map((row) => ({
        key: `my_assignment:${row.id}`,
        kind: 'my_assignment' as const,
        title: row.title,
        subtitle: row.subtitle,
        href: `/asignaciones?id=${row.id}`,
        at: row.dueAt || '',
      })),
  ];

  return { actions, timeline };
}

export function groupMonitorByTime(items: PendingMonitorItem[], now = new Date()) {
  const groups = Object.fromEntries(ATTENTION_BUCKETS.map((bucket) => [bucket, [] as PendingMonitorItem[]])) as Record<
    AttentionBucket,
    PendingMonitorItem[]
  >;
  for (const item of items) {
    groups[attentionBucket(item.at, now)].push(item);
  }
  for (const bucket of ATTENTION_BUCKETS) {
    groups[bucket].sort((a, b) => {
      if (!a.at && b.at) return 1;
      if (a.at && !b.at) return -1;
      return a.at.localeCompare(b.at) || a.title.localeCompare(b.title);
    });
  }
  return ATTENTION_BUCKETS.filter((bucket) => groups[bucket].length).map((bucket) => ({
    bucket,
    items: groups[bucket],
  }));
}

export type PendingHomeFilter = 'all' | 'actions' | AttentionBucket;

export type PendingFilterCounts = Record<PendingHomeFilter, number>;

export function pendingFilterCounts(
  actions: PendingMonitorItem[],
  timeline: PendingMonitorItem[],
  now = new Date()
): PendingFilterCounts {
  const counts: PendingFilterCounts = { all: 0, actions: actions.length, overdue: 0, today: 0, week: 0, later: 0 };
  for (const row of actions) counts[attentionBucket(row.at, now)] += 1;
  for (const row of timeline) counts[attentionBucket(row.at, now)] += 1;
  counts.all = actions.length + timeline.length;
  return counts;
}

export type MonitorTimeKind =
  | { kind: 'none' }
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'yesterday' }
  | { kind: 'ago'; days: number }
  | { kind: 'later'; days: number };

function ymdToUtcMs(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
}

export function calendarDayDiff(at: string | null | undefined, now = new Date()) {
  const ymd = attentionYmd(at);
  if (!ymd) return null;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  const itemMs = ymdToUtcMs(ymd);
  const todayMs = ymdToUtcMs(today);
  if (itemMs == null || todayMs == null) return null;
  return Math.round((itemMs - todayMs) / 86_400_000);
}

export function monitorTimeKind(at: string | null | undefined, now = new Date()): MonitorTimeKind {
  const diff = calendarDayDiff(at, now);
  if (diff == null) return { kind: 'none' };
  if (diff === 0) return { kind: 'today' };
  if (diff === 1) return { kind: 'tomorrow' };
  if (diff === -1) return { kind: 'yesterday' };
  if (diff < 0) return { kind: 'ago', days: Math.abs(diff) };
  return { kind: 'later', days: diff };
}
