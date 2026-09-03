export const WORK_STREAMS = ['internal', 'commercial', 'delivery', 'production', 'evolution', 'people'] as const;
export const WORK_STATUSES = [
  'backlog',
  'discovery',
  'build',
  'review',
  'blocked',
  'done',
] as const;
export const WORK_PROCESS_KINDS = ['none', 'internal', 'project', 'lead', 'quote', 'ticket'] as const;

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
  internal: 'emerald',
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
  emerald: {
    card: 'border-emerald-200 bg-emerald-50',
    bar: 'bg-emerald-600',
    swatch: 'bg-emerald-500',
    ring: 'ring-emerald-400',
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

export type WorkFile = {
  id: string;
  assignment_id: string;
  file_name: string;
  content_type: string;
  byte_size: number;
  kind: 'image' | 'file';
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
  files: WorkFile[];
  subtask_edit_request: WorkSubtaskEditRequest | null;
};

export type WorkSubtaskEditRequest = {
  id: string;
  assignment_id: string;
  requested_by: string;
  requested_by_name: string;
  payload: string;
  created_at: string;
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

export type OpenWorkStatus = Exclude<WorkStatus, 'done' | 'blocked'>;

export const OPEN_WORK_STATUSES = WORK_STATUSES.filter(
  (status): status is OpenWorkStatus => status !== 'done' && status !== 'blocked'
);

export function isOpenWorkStatus(value: string): value is OpenWorkStatus {
  return (OPEN_WORK_STATUSES as readonly string[]).includes(value);
}

export function isPendingMentionStatus(value: string | null | undefined) {
  return Boolean(value) && value !== 'done';
}

export function keepPendingMentions<T extends { assignment_id: string }>(
  mentions: T[],
  statusByAssignmentId: Map<string, string>
) {
  return mentions.filter((row) =>
    isPendingMentionStatus(statusByAssignmentId.get(row.assignment_id))
  );
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

export function canMutateWorkAssignment(
  staffId: string,
  assigneeId: string | null | undefined,
  canManage: boolean
) {
  if (canManage) return true;
  const staff = String(staffId || '').trim().toLowerCase();
  const assignee = String(assigneeId || '').trim().toLowerCase();
  return Boolean(staff && assignee && staff === assignee);
}

export function canRequestWorkSubtaskEdit(
  staffId: string,
  assigneeId: string | null | undefined,
  canManage: boolean
) {
  return !canManage && canMutateWorkAssignment(staffId, assigneeId, false);
}

export function workSubtaskEditorText(subtasks: Pick<WorkSubtask, 'title' | 'sort_order'>[]) {
  return [...subtasks]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((row) => row.title)
    .join('\n');
}

export const WORK_FILE_MAX_BYTES = 4 * 1024 * 1024;
export const WORK_FILE_MAX_COUNT = 6;
export const WORK_FILE_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp,application/pdf,.pdf,text/plain,.txt,application/msword,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx,application/vnd.ms-excel,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx,application/zip,.zip';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const FILE_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
]);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const FILE_EXTS = new Set(['pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'zip']);

function fileExt(name: string) {
  const base = name.split(/[/\\]/).pop() || name;
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
}

export function workFileKind(type: string, name: string): 'image' | 'file' | null {
  const mime = String(type || '').trim().toLowerCase();
  const ext = fileExt(name);
  if (IMAGE_TYPES.has(mime) || IMAGE_EXTS.has(ext)) return 'image';
  if (FILE_TYPES.has(mime) || FILE_EXTS.has(ext)) return 'file';
  return null;
}

export function workFileHref(id: string) {
  return `/api/ops/assignment-file?id=${encodeURIComponent(id)}`;
}

export function isWorkFormFile(value: FormDataEntryValue): value is File {
  if (typeof value !== 'object' || value === null) return false;
  const file = value as File;
  if (!(Number(file.size) > 0)) return false;
  if (typeof File !== 'undefined' && value instanceof File) return true;
  return typeof file.name === 'string' && typeof file.arrayBuffer === 'function';
}

export function appendWorkFormFiles(formData: FormData, files: File[], field = 'files') {
  formData.delete(field);
  for (const file of files) {
    if (file.size > 0) formData.append(field, file, file.name);
  }
}

export function clampWorkProgress(pct: number) {
  if (!Number.isFinite(pct)) return 0;
  return Math.max(0, Math.min(100, Math.round(pct)));
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

export function patchWorkSubtaskStatus(
  assignments: WorkAssignment[],
  subtaskId: string,
  status: WorkSubtask['status']
) {
  return assignments.map((row) => {
    if (!row.subtasks.some((sub) => sub.id === subtaskId)) return row;
    const subtasks = row.subtasks.map((sub) => (sub.id === subtaskId ? { ...sub, status } : sub));
    return { ...row, subtasks, progress_pct: rollupProgressFromSubtasks(subtasks) };
  });
}

export function parseSubtaskLines(value: string) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 40);
}

export function planWorkSubtaskRewrite(
  current: Pick<WorkSubtask, 'id' | 'title' | 'sort_order'>[],
  lines: string[]
) {
  const ordered = [...current].sort((a, b) => a.sort_order - b.sort_order);
  const titles = parseSubtaskLines(lines.join('\n'));
  const updates: { id: string; title: string; sort_order: number }[] = [];
  const inserts: { title: string; sort_order: number }[] = [];
  const deleteIds: string[] = [];
  for (let i = 0; i < titles.length; i += 1) {
    const row = ordered[i];
    if (row) updates.push({ id: row.id, title: titles[i], sort_order: i });
    else inserts.push({ title: titles[i], sort_order: i });
  }
  for (let i = titles.length; i < ordered.length; i += 1) {
    deleteIds.push(ordered[i].id);
  }
  return { updates, inserts, deleteIds };
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
  extras?: { projectSlug?: string | null; internalHref?: string | null }
) {
  if (kind === 'none') return extras?.internalHref ?? null;
  if (kind === 'internal') return extras?.internalHref || null;
  if (!id) return null;
  if (kind === 'lead') return `/leads/${id}`;
  if (kind === 'project') return extras?.projectSlug ? `/projects/${extras.projectSlug}` : `/projects/${id}`;
  if (kind === 'quote') return `/quotes/${id}`;
  if (kind === 'ticket') return `/tickets/${id}`;
  return null;
}
