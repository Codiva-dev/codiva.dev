export const INTERVIEW_REPORT_BUCKET = 'interview-reports';
export const INTERVIEW_MAX_REPORT_BYTES = 10 * 1024 * 1024;

export const INTERVIEW_REPORT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type InterviewReportMime = (typeof INTERVIEW_REPORT_MIME_TYPES)[number];

const INTERVIEW_REPORT_EXT_BY_MIME: Record<InterviewReportMime, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

const INTERVIEW_REPORT_MIME_BY_EXT: Record<string, InterviewReportMime> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export const INTERVIEW_PARTNER_ROLES = ['coordinator', 'interviewer'] as const;
export type InterviewPartnerRole = (typeof INTERVIEW_PARTNER_ROLES)[number];

export type InterviewAssignee =
  | { kind: 'staff'; id: string }
  | { kind: 'partner'; id: string }
  | { kind: 'none' };

export type InterviewAssignmentScope = {
  round_id?: string | null;
  application_id?: string | null;
  job_posting_id?: string | null;
};

export type InterviewFollowUp = 'pending' | 'needs_report' | 'closed';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isInterviewUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function parseInterviewViewAsCookie(value: string | undefined): string | null {
  const trimmed = String(value || '').trim();
  return isInterviewUuid(trimmed) ? trimmed : null;
}

export function isInterviewPartnerRole(value: string): value is InterviewPartnerRole {
  return (INTERVIEW_PARTNER_ROLES as readonly string[]).includes(value);
}

export function encodeInterviewAssignee(assignee: InterviewAssignee): string {
  if (assignee.kind === 'staff') return `staff:${assignee.id}`;
  if (assignee.kind === 'partner') return `partner:${assignee.id}`;
  return '';
}

export function parseInterviewAssignee(raw: string): InterviewAssignee {
  const value = String(raw || '').trim();
  if (!value) return { kind: 'none' };
  const [kind, id] = value.split(':');
  if ((kind === 'staff' || kind === 'partner') && id && isInterviewUuid(id)) {
    return { kind, id };
  }
  if (isInterviewUuid(value)) return { kind: 'staff', id: value };
  return { kind: 'none' };
}

export function assignmentMatchesApplication(
  assignment: InterviewAssignmentScope,
  application: { id: string; job_posting_id: string },
  rounds: { id: string; application_id: string }[]
): boolean {
  if (assignment.application_id === application.id) return true;
  if (assignment.job_posting_id === application.job_posting_id) return true;
  if (assignment.round_id) {
    return rounds.some((round) => round.id === assignment.round_id && round.application_id === application.id);
  }
  return false;
}

export function visibleApplicationIds(
  assignments: InterviewAssignmentScope[],
  applications: { id: string; job_posting_id: string }[],
  rounds: { id: string; application_id: string }[]
): string[] {
  const ids = new Set<string>();
  for (const application of applications) {
    if (assignments.some((row) => assignmentMatchesApplication(row, application, rounds))) {
      ids.add(application.id);
    }
  }
  return [...ids];
}

export function assignedJobPostingIds(assignments: InterviewAssignmentScope[]): string[] {
  return [
    ...new Set(
      assignments
        .map((row) => row.job_posting_id)
        .filter((id): id is string => typeof id === 'string' && isInterviewUuid(id))
    ),
  ];
}

export function partnerMaySetApplicationStatus(_status: string): boolean {
  return false;
}

export function interviewFollowUp(input: {
  status: string;
  reportCount: number;
}): InterviewFollowUp {
  if (input.status === 'skipped') return 'closed';
  if (input.status === 'done') return input.reportCount > 0 ? 'closed' : 'needs_report';
  return 'pending';
}

export function interviewReportExtension(filename: string): string {
  const match = String(filename || '')
    .trim()
    .toLowerCase()
    .match(/(\.[a-z0-9]+)$/);
  return match?.[1] ?? '';
}

export function resolveInterviewReportMime(opts: {
  mimeType?: string | null;
  filename?: string | null;
}): InterviewReportMime | null {
  const mime = String(opts.mimeType || '')
    .trim()
    .toLowerCase();
  if ((INTERVIEW_REPORT_MIME_TYPES as readonly string[]).includes(mime)) {
    return mime as InterviewReportMime;
  }
  const ext = interviewReportExtension(opts.filename || '');
  return INTERVIEW_REPORT_MIME_BY_EXT[ext] ?? null;
}

export function buildInterviewReportPath(roundId: string, originalFilename: string, mime?: InterviewReportMime): string {
  const ext =
    (mime ? INTERVIEW_REPORT_EXT_BY_MIME[mime] : null) ||
    interviewReportExtension(originalFilename) ||
    '.pdf';
  const base = String(originalFilename || `analisis${ext}`)
    .trim()
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9._-]+/g, '_')
    .slice(0, 100);
  const name = `${base || 'analisis'}${ext}`;
  return `rounds/${roundId}/${crypto.randomUUID()}_${name}`;
}
