import { foldText, textMatches } from '@/lib/ops/search-text';

export const OPS_CALENDAR_TZ = 'America/Mexico_City';
export const SPRINT_STATUS_FILTERS = ['planned', 'active', 'completed'] as const;

export type SprintStatusFilter = 'all' | (typeof SPRINT_STATUS_FILTERS)[number];

export type SprintRow = {
  id: string;
  name: string;
  goal: string;
  starts_on: string | null;
  ends_on: string | null;
  status: string;
};

export type SprintItemRow = {
  id: string;
  sprint_id: string;
  title: string;
  details: string;
  status: string;
  assignee_id: string | null;
};

export type SprintSearchHit = {
  item: SprintItemRow;
  sprint: SprintRow;
};

export type SprintBoardQuery = {
  sprint?: string | null;
  sprintStatus?: string | null;
  q?: string | null;
};

/** Fecha de calendario Ops (CDMX), YYYY-MM-DD. */
export function opsCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: OPS_CALENDAR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function dateKey(value: string | null | undefined): string | null {
  const raw = String(value || '').trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

export function sprintCoversDate(sprint: Pick<SprintRow, 'starts_on' | 'ends_on'>, today: string): boolean {
  const start = dateKey(sprint.starts_on);
  const end = dateKey(sprint.ends_on);
  if (!start && !end) return false;
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

export function compareSprintsBySchedule(a: SprintRow, b: SprintRow): number {
  const startA = dateKey(a.starts_on) ?? '9999-99-99';
  const startB = dateKey(b.starts_on) ?? '9999-99-99';
  if (startA !== startB) return startA < startB ? -1 : 1;
  const endA = dateKey(a.ends_on) ?? '9999-99-99';
  const endB = dateKey(b.ends_on) ?? '9999-99-99';
  if (endA !== endB) return endA < endB ? -1 : 1;
  return a.name.localeCompare(b.name, 'es');
}

export function sortSprintsBySchedule(sprints: SprintRow[]): SprintRow[] {
  return [...sprints].sort(compareSprintsBySchedule);
}

export function parseSprintStatusFilter(value: string | null | undefined): SprintStatusFilter {
  const raw = String(value || '').trim();
  return SPRINT_STATUS_FILTERS.includes(raw as (typeof SPRINT_STATUS_FILTERS)[number])
    ? (raw as SprintStatusFilter)
    : 'all';
}

export function filterSprintsByStatus(sprints: SprintRow[], filter: SprintStatusFilter): SprintRow[] {
  if (filter === 'all') return sprints;
  return sprints.filter((sprint) => sprint.status === filter);
}

export function defaultSprintId(sprints: SprintRow[], today = opsCalendarDate()): string | null {
  const sorted = sortSprintsBySchedule(sprints);
  if (!sorted.length) return null;

  const covering = sorted.filter((sprint) => sprintCoversDate(sprint, today));
  if (covering.length) return covering[covering.length - 1].id;

  const active = sorted.filter((sprint) => sprint.status === 'active');
  const started = active.filter((sprint) => {
    const start = dateKey(sprint.starts_on);
    return !start || start <= today;
  });
  if (started.length) return started[started.length - 1].id;
  if (active.length) return active[0].id;
  return sorted[0].id;
}

export function resolveSelectedSprintId(
  sprints: SprintRow[],
  requestedId: string | null | undefined,
  filter: SprintStatusFilter = 'all',
  today = opsCalendarDate()
): string | null {
  const visible = filterSprintsByStatus(sortSprintsBySchedule(sprints), filter);
  if (!visible.length) return null;
  const requested = String(requestedId || '').trim();
  if (requested && visible.some((sprint) => sprint.id === requested)) return requested;
  return defaultSprintId(visible, today);
}

export function normalizeSprintSearch(query: string | null | undefined): string {
  return foldText(query);
}

export function searchSprintItems(
  sprints: SprintRow[],
  items: SprintItemRow[],
  query: string,
  assigneeName: (id: string | null) => string
): SprintSearchHit[] {
  const needle = normalizeSprintSearch(query);
  if (!needle) return [];
  const byId = new Map(sprints.map((sprint) => [sprint.id, sprint]));
  const hits: SprintSearchHit[] = [];
  for (const item of items) {
    const sprint = byId.get(item.sprint_id);
    if (!sprint) continue;
    const haystack = `${item.title} ${item.details} ${sprint.name} ${sprint.goal} ${assigneeName(item.assignee_id)}`;
    if (textMatches(haystack, query)) hits.push({ item, sprint });
  }
  return hits;
}

export function projectSprintsSearch(query: SprintBoardQuery = {}): string {
  const params = new URLSearchParams();
  params.set('tab', 'sprints');
  const status = parseSprintStatusFilter(query.sprintStatus);
  if (status !== 'all') params.set('sprintStatus', status);
  const sprint = String(query.sprint || '').trim();
  if (sprint) params.set('sprint', sprint);
  const q = String(query.q || '').trim();
  if (q) params.set('q', q);
  return `?${params.toString()}`;
}

export function querySuffix(values: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(values)) {
    const value = Array.isArray(raw) ? raw[0] : raw;
    const trimmed = value?.trim();
    if (trimmed) params.set(key, trimmed);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
