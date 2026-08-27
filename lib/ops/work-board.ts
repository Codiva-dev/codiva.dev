export const WORK_STREAMS = ['commercial', 'delivery', 'production', 'evolution', 'people'] as const;
export const WORK_STATUSES = [
  'backlog',
  'discovery',
  'build',
  'review',
  'blocked',
  'done',
] as const;
export const WORK_PROCESS_KINDS = ['none', 'lead', 'project', 'quote', 'ticket'] as const;

export type WorkStream = (typeof WORK_STREAMS)[number];
export type WorkStatus = (typeof WORK_STATUSES)[number];
export type WorkProcessKind = (typeof WORK_PROCESS_KINDS)[number];

export const WORK_BOARD_COLUMNS: readonly WorkStatus[] = [
  'backlog',
  'discovery',
  'build',
  'review',
  'done',
  'blocked',
];

export const WORK_STREAM_COLOR: Record<WorkStream, string> = {
  commercial: 'sky',
  delivery: 'teal',
  production: 'violet',
  evolution: 'amber',
  people: 'rose',
};

export const WORK_COLOR_TONE: Record<
  string,
  { card: string; bar: string; swatch: string; ring: string }
> = {
  teal: {
    card: 'border-teal-200 bg-teal-50',
    bar: 'bg-teal-700',
    swatch: 'bg-teal-600',
    ring: 'ring-teal-400',
  },
  sky: {
    card: 'border-sky-200 bg-sky-50',
    bar: 'bg-sky-600',
    swatch: 'bg-sky-500',
    ring: 'ring-sky-400',
  },
  violet: {
    card: 'border-violet-200 bg-violet-50',
    bar: 'bg-violet-600',
    swatch: 'bg-violet-500',
    ring: 'ring-violet-400',
  },
  amber: {
    card: 'border-amber-200 bg-amber-50',
    bar: 'bg-amber-500',
    swatch: 'bg-amber-400',
    ring: 'ring-amber-400',
  },
  rose: {
    card: 'border-rose-200 bg-rose-50',
    bar: 'bg-rose-600',
    swatch: 'bg-rose-500',
    ring: 'ring-rose-400',
  },
};

export type WorkSubtask = {
  id: string;
  assignment_id: string;
  title: string;
  status: 'open' | 'done';
  sort_order: number;
  due_at: string | null;
};

export type WorkStageEvent = {
  id: string;
  assignment_id: string;
  from_status: string | null;
  to_status: string;
  entered_at: string;
  left_at: string | null;
  actor_id: string | null;
  source: string;
};

export type WorkComment = {
  id: string;
  assignment_id: string;
  author_id: string | null;
  author_name: string;
  body: string;
  created_at: string;
};

export type WorkAssignment = {
  id: string;
  title: string;
  description: string;
  stream: WorkStream;
  status: WorkStatus;
  assignee_id: string | null;
  assignee_name: string;
  due_at: string | null;
  progress_pct: number;
  process_kind: WorkProcessKind;
  process_id: string | null;
  process_label: string;
  process_href: string | null;
  status_entered_at: string;
  created_at: string;
  created_by: string | null;
  subtasks: WorkSubtask[];
  stage_events: WorkStageEvent[];
  comments: WorkComment[];
};

export type MentionPart =
  | { type: 'text'; text: string }
  | { type: 'mention'; label: string; userId: string; raw: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENTION_TOKEN_RE =
  /@\[([^\]]{1,120})\]\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)/gi;

export function isWorkStream(value: string): value is WorkStream {
  return (WORK_STREAMS as readonly string[]).includes(value);
}

export function isWorkStatus(value: string): value is WorkStatus {
  return (WORK_STATUSES as readonly string[]).includes(value);
}

export function isWorkProcessKind(value: string): value is WorkProcessKind {
  return (WORK_PROCESS_KINDS as readonly string[]).includes(value);
}

export function workColorForStream(stream: string) {
  const id = String(stream || '').trim().toLowerCase();
  return isWorkStream(id) ? WORK_STREAM_COLOR[id] : 'teal';
}

export function workColorTone(stream: string) {
  return WORK_COLOR_TONE[workColorForStream(stream)] ?? WORK_COLOR_TONE.teal;
}

export function workSubtaskCounts(assignment: Pick<WorkAssignment, 'subtasks'>) {
  const subs = Array.isArray(assignment.subtasks) ? assignment.subtasks : [];
  const total = subs.length;
  const done = subs.filter((s) => s.status === 'done').length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function rollupProgressFromSubtasks(subtasks: Pick<WorkSubtask, 'status'>[]) {
  const total = subtasks.length;
  if (!total) return 0;
  const done = subtasks.filter((s) => s.status === 'done').length;
  return Math.round((done / total) * 100);
}

export function parentCannotMarkDoneWithOpenSubtasks(subtasks: Pick<WorkSubtask, 'status'>[]) {
  return subtasks.some((s) => s.status !== 'done');
}

export function workAssignmentPreview(assignment: Pick<WorkAssignment, 'description'>, max = 140) {
  const d = String(assignment.description || '').trim();
  if (!d) return '';
  if (d.length <= max) return d;
  return `${d.slice(0, max).trim()}…`;
}

export function patchWorkAssignmentStatus(
  assignments: WorkAssignment[],
  assignmentId: string,
  status: WorkStatus,
  enteredAt = new Date().toISOString()
) {
  return assignments.map((row) =>
    row.id === assignmentId ? { ...row, status, status_entered_at: enteredAt } : row
  );
}

export function formatDwellDuration(ms: number, locale: 'es' | 'en' = 'es') {
  const safe = Math.max(0, ms);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (safe < minute) return locale === 'en' ? 'now' : 'ahora';
  if (safe < hour) {
    const m = Math.max(1, Math.round(safe / minute));
    return locale === 'en' ? `${m}m` : `${m} min`;
  }
  if (safe < day) {
    const h = Math.floor(safe / hour);
    const m = Math.round((safe % hour) / minute);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(safe / day);
  const h = Math.round((safe % day) / hour);
  return h ? `${d}d ${h}h` : `${d}d`;
}

export function dwellMsSince(enteredAt: string | null | undefined, now = Date.now()) {
  const ms = Date.parse(String(enteredAt || ''));
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, now - ms);
}

export function stageEventDurationMs(event: Pick<WorkStageEvent, 'entered_at' | 'left_at'>, now = Date.now()) {
  const start = Date.parse(event.entered_at);
  if (Number.isNaN(start)) return 0;
  const end = event.left_at ? Date.parse(event.left_at) : now;
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - start);
}

export function isUuid(value: string) {
  return UUID_RE.test(String(value || '').trim());
}

export function mentionDisplayName(user: { full_name?: string | null; email?: string | null }) {
  const name = String(user?.full_name || '').trim();
  if (name) return name;
  return String(user?.email || '').trim() || 'Staff';
}

export function buildMentionToken(user: { id: string; full_name?: string | null; email?: string | null }) {
  const id = String(user?.id || '').trim();
  if (!isUuid(id)) return '';
  const label = mentionDisplayName(user).replace(/[[\]]/g, '');
  return `@[${label}](${id})`;
}

export function splitMentionTokens(body: string): MentionPart[] {
  const raw = String(body ?? '');
  const out: MentionPart[] = [];
  const re = new RegExp(MENTION_TOKEN_RE.source, 'gi');
  let last = 0;
  let match = re.exec(raw);
  while (match) {
    if (match.index > last) out.push({ type: 'text', text: raw.slice(last, match.index) });
    out.push({
      type: 'mention',
      label: String(match[1] || '').trim() || 'staff',
      userId: String(match[2] || '').trim().toLowerCase(),
      raw: match[0],
    });
    last = match.index + match[0].length;
    match = re.exec(raw);
  }
  if (last < raw.length) out.push({ type: 'text', text: raw.slice(last) });
  return out;
}

export function mentionedStaffIds(body: string) {
  const ids = new Set<string>();
  for (const part of splitMentionTokens(body)) {
    if (part.type === 'mention' && isUuid(part.userId)) ids.add(part.userId);
  }
  return [...ids];
}

export function mentionPlainText(body: string) {
  return splitMentionTokens(body)
    .map((part) => (part.type === 'mention' ? `@${part.label}` : part.text))
    .join('');
}

export function activeMentionQuery(text: string, caret: number): { query: string; start: number } | null {
  const value = String(text ?? '');
  const pos = Number.isFinite(caret) ? caret : value.length;
  const before = value.slice(0, pos);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0 && /[A-Za-z0-9_\]]$/.test(before.slice(at - 1, at))) return null;
  const fragment = before.slice(at + 1);
  if (fragment.includes('\n') || fragment.startsWith('[')) return null;
  if (fragment.length > 48) return null;
  return { query: fragment, start: at };
}

export function filterMentionableStaff(
  staff: Array<{ id: string; full_name: string; email?: string | null }>,
  query: string,
  excludeUserId?: string
) {
  const q = String(query || '').trim().toLowerCase();
  const exclude = String(excludeUserId || '').trim();
  return staff.filter((row) => {
    if (!row.id || row.id === exclude) return false;
    if (!q) return true;
    const hay = `${row.full_name || ''} ${row.email || ''}`.toLowerCase();
    return hay.includes(q);
  });
}

export function processHref(
  kind: WorkProcessKind,
  id: string | null,
  extras?: { projectSlug?: string | null }
) {
  if (!id || kind === 'none') return null;
  if (kind === 'lead') return `/leads/${id}`;
  if (kind === 'project') return extras?.projectSlug ? `/projects/${extras.projectSlug}` : `/projects/${id}`;
  if (kind === 'quote') return `/quotes/${id}`;
  if (kind === 'ticket') return `/tickets/${id}`;
  return null;
}
