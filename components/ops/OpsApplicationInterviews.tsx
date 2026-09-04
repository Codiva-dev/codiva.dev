import ToastForm from '@/components/ops/ToastForm';
import {
  addJobInterviewComment,
  addJobInterviewRound,
  deleteJobInterviewComment,
  deleteJobInterviewRound,
  updateJobInterviewComment,
  updateJobInterviewRound,
} from '@/lib/ops/career-actions';
import { encodeInterviewAssignee } from '@/lib/ops/interview-partner';
import {
  JOB_INTERVIEW_KINDS,
  JOB_INTERVIEW_OUTCOMES,
  JOB_INTERVIEW_ROUND_STATUSES,
  isJobInterviewKind,
  isJobInterviewOutcome,
  isJobInterviewRoundStatus,
} from '@/lib/ops/careers';
import type { Translator } from '@/i18n/locale';

export type OpsInterviewStaff = { id: string; full_name: string };
export type OpsInterviewPartnerOption = { id: string; user_id: string; full_name: string; partner_name: string };
export type OpsInterviewReportRow = {
  id: string;
  round_id: string;
  original_filename: string | null;
};

export type OpsInterviewCommentRow = {
  id: string;
  round_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type OpsInterviewRoundRow = {
  id: string;
  application_id: string;
  sort_order: number;
  kind: string;
  title: string;
  status: string;
  outcome: string | null;
  interviewer_id: string | null;
  partner_member_id?: string | null;
  conducted_at: string | null;
  created_at: string;
};

function assigneeLabel(
  staff: OpsInterviewStaff[],
  partners: OpsInterviewPartnerOption[],
  round: { interviewer_id: string | null; partner_member_id?: string | null }
) {
  if (round.partner_member_id) {
    const partner = partners.find((row) => row.id === round.partner_member_id);
    return partner ? `${partner.full_name} · ${partner.partner_name}` : null;
  }
  if (!round.interviewer_id) return null;
  return staff.find((row) => row.id === round.interviewer_id)?.full_name ?? null;
}

function AssigneeSelect({
  name,
  defaultValue,
  staff,
  partners,
  t,
}: {
  name: string;
  defaultValue: string;
  staff: OpsInterviewStaff[];
  partners: OpsInterviewPartnerOption[];
  t: Translator;
}) {
  return (
    <select name={name} defaultValue={defaultValue} className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm">
      <option value="">{t('ops.careers.interviewUnassigned')}</option>
      {staff.length ? (
        <optgroup label={t('ops.careers.interviewStaffGroup')}>
          {staff.map((row) => (
            <option key={row.id} value={encodeInterviewAssignee({ kind: 'staff', id: row.id })}>
              {row.full_name}
            </option>
          ))}
        </optgroup>
      ) : null}
      {partners.length ? (
        <optgroup label={t('ops.careers.interviewPartnerGroup')}>
          {partners.map((row) => (
            <option key={row.id} value={encodeInterviewAssignee({ kind: 'partner', id: row.id })}>
              {row.full_name} · {row.partner_name}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}

function commentAuthorName(
  staff: OpsInterviewStaff[],
  partners: OpsInterviewPartnerOption[],
  authorId: string
) {
  return (
    staff.find((row) => row.id === authorId)?.full_name ||
    partners.find((row) => row.user_id === authorId)?.full_name ||
    null
  );
}

function kindLabel(kind: string, t: Translator) {
  if (!isJobInterviewKind(kind)) return kind;
  return t(`ops.careers.interviewKind.${kind}` as const);
}

function statusLabel(status: string, t: Translator) {
  if (!isJobInterviewRoundStatus(status)) return status;
  return t(`ops.careers.interviewRoundStatus.${status}` as const);
}

function outcomeLabel(outcome: string | null, t: Translator) {
  if (!outcome || !isJobInterviewOutcome(outcome)) return null;
  return t(`ops.careers.interviewOutcome.${outcome}` as const);
}

export default function OpsApplicationInterviews({
  applicationId,
  rounds,
  comments,
  staff,
  partners = [],
  reports = [],
  currentUserId,
  canTeam,
  t,
  formatDate,
}: {
  applicationId: string;
  rounds: OpsInterviewRoundRow[];
  comments: OpsInterviewCommentRow[];
  staff: OpsInterviewStaff[];
  partners?: OpsInterviewPartnerOption[];
  reports?: OpsInterviewReportRow[];
  currentUserId: string;
  canTeam: boolean;
  t: Translator;
  formatDate: (date: string | null | undefined) => string;
}) {
  const commentsByRound = new Map<string, OpsInterviewCommentRow[]>();
  for (const row of comments) {
    const list = commentsByRound.get(row.round_id) ?? [];
    list.push(row);
    commentsByRound.set(row.round_id, list);
  }

  const active = rounds.filter((row) => row.status !== 'skipped');
  const done = active.filter((row) => row.status === 'done').length;
  const summary = rounds.length
    ? t('ops.careers.interviewProgress', { done: String(done), total: String(active.length || rounds.length) })
    : t('ops.careers.interviewsTitle');

  return (
    <details className="group mt-3 rounded-lg border border-zinc-200 bg-zinc-50 open:bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100/80 [&::-webkit-details-marker]:hidden">
        {summary}
      </summary>
      <div className="space-y-3 border-t border-zinc-200 px-3 py-3">
        {rounds.length ? (
          <ul className="space-y-3">
            {rounds.map((round) => {
              const roundComments = commentsByRound.get(round.id) ?? [];
              const interviewer = assigneeLabel(staff, partners, round);
              const canComment =
                canTeam ||
                !round.interviewer_id ||
                round.interviewer_id === currentUserId ||
                Boolean(round.partner_member_id);
              const outcome = outcomeLabel(round.outcome, t);
              const roundReports = reports.filter((row) => row.round_id === round.id);
              return (
                <li key={round.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                  <p className="text-sm font-medium text-zinc-800">{round.title}</p>
                  <p className="text-xs text-zinc-500">
                    {kindLabel(round.kind, t)}
                    {' · '}
                    {statusLabel(round.status, t)}
                    {outcome ? ` · ${outcome}` : ''}
                    {interviewer ? ` · ${interviewer}` : ''}
                    {round.conducted_at ? ` · ${formatDate(round.conducted_at)}` : ''}
                  </p>
                  {roundComments.length ? (
                    <ul className="mt-2 space-y-2">
                      {roundComments.map((comment) => {
                        const canEditComment = canTeam || comment.author_id === currentUserId;
                        return (
                        <li key={comment.id} className="rounded-md bg-zinc-50 px-2.5 py-2 text-sm text-zinc-700">
                          {canEditComment ? (
                            <ToastForm
                              success={t('ops.careers.commentUpdated')}
                              action={async (fd) => {
                                'use server';
                                await updateJobInterviewComment(comment.id, fd);
                              }}
                              className="space-y-2"
                            >
                              <textarea
                                name="body"
                                required
                                rows={3}
                                maxLength={4000}
                                defaultValue={comment.body}
                                className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="submit"
                                  className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs hover:bg-white"
                                >
                                  {t('ops.team.save')}
                                </button>
                              </div>
                            </ToastForm>
                          ) : (
                            <p className="whitespace-pre-line">{comment.body}</p>
                          )}
                          <p className="mt-1 text-xs text-zinc-400">
                            {commentAuthorName(staff, partners, comment.author_id) ||
                              t('ops.careers.interviewUnknownAuthor')}
                            {' · '}
                            {formatDate(comment.created_at)}
                          </p>
                          {canEditComment ? (
                            <ToastForm
                              success={t('ops.careers.commentDeleted')}
                              confirmMessage={t('ops.careers.deleteCommentConfirm')}
                              confirmLabel={t('ops.careers.deleteComment')}
                              action={async () => {
                                'use server';
                                await deleteJobInterviewComment(comment.id);
                              }}
                              className="mt-1"
                            >
                              <button type="submit" className="text-xs text-red-700 hover:underline">
                                {t('ops.careers.deleteComment')}
                              </button>
                            </ToastForm>
                          ) : null}
                        </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  {roundReports.length ? (
                    <ul className="mt-2 space-y-1 text-xs">
                      {roundReports.map((report) => (
                        <li key={report.id}>
                          <a
                            href={`/api/entrevistas/report?id=${report.id}`}
                            className="text-codiva-primary hover:underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {report.original_filename || t('ops.careers.interviewReportOpen')}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-400">{t('ops.careers.interviewReportEmpty')}</p>
                  )}
                  <ToastForm
                    success={t('ops.careers.interviewRoundSaved')}
                    action={async (fd) => {
                      'use server';
                      await updateJobInterviewRound(round.id, fd);
                    }}
                    className="mt-2 grid gap-2 sm:grid-cols-2"
                  >
                    <input
                      name="title"
                      defaultValue={round.title}
                      maxLength={120}
                      required
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
                    />
                    <select
                      name="kind"
                      defaultValue={isJobInterviewKind(round.kind) ? round.kind : 'other'}
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    >
                      {JOB_INTERVIEW_KINDS.map((kind) => (
                        <option key={kind} value={kind}>
                          {kindLabel(kind, t)}
                        </option>
                      ))}
                    </select>
                    <select
                      name="status"
                      defaultValue={
                        isJobInterviewRoundStatus(round.status) ? round.status : 'planned'
                      }
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    >
                      {JOB_INTERVIEW_ROUND_STATUSES.map((value) => (
                        <option key={value} value={value}>
                          {statusLabel(value, t)}
                        </option>
                      ))}
                    </select>
                    <select
                      name="outcome"
                      defaultValue={
                        round.outcome && isJobInterviewOutcome(round.outcome) ? round.outcome : ''
                      }
                      className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                    >
                      <option value="">{t('ops.careers.interviewOutcomeNone')}</option>
                      {JOB_INTERVIEW_OUTCOMES.map((value) => (
                        <option key={value} value={value}>
                          {outcomeLabel(value, t)}
                        </option>
                      ))}
                    </select>
                    <AssigneeSelect
                      name="assignee"
                      defaultValue={encodeInterviewAssignee(
                        round.partner_member_id
                          ? { kind: 'partner', id: round.partner_member_id }
                          : round.interviewer_id
                            ? { kind: 'staff', id: round.interviewer_id }
                            : { kind: 'none' }
                      )}
                      staff={staff}
                      partners={partners}
                      t={t}
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 sm:col-span-2"
                    >
                      {t('ops.team.save')}
                    </button>
                  </ToastForm>
                  <ToastForm
                    success={t('ops.careers.roundDeleted')}
                    confirmMessage={t('ops.careers.deleteRoundConfirm')}
                    confirmLabel={t('ops.careers.deleteRound')}
                    action={async () => {
                      'use server';
                      await deleteJobInterviewRound(round.id);
                    }}
                    className="mt-2"
                  >
                    <button type="submit" className="text-xs text-red-700 hover:underline">
                      {t('ops.careers.deleteRound')}
                    </button>
                  </ToastForm>
                  {canComment ? (
                    <ToastForm
                      success={t('ops.careers.interviewCommentSaved')}
                      action={async (fd) => {
                        'use server';
                        await addJobInterviewComment(round.id, fd);
                      }}
                      className="mt-2 space-y-2"
                    >
                      <textarea
                        name="body"
                        required
                        rows={3}
                        maxLength={4000}
                        aria-label={t('ops.careers.interviewCommentPlaceholder')}
                        placeholder={t('ops.careers.interviewCommentPlaceholder')}
                        className="w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm text-white"
                      >
                        {t('ops.careers.interviewCommentSubmit')}
                      </button>
                    </ToastForm>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-500">{t('ops.careers.interviewCommentLocked')}</p>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">{t('ops.careers.interviewsEmpty')}</p>
        )}
        <ToastForm
          success={t('ops.careers.interviewRoundAdded')}
          action={async (fd) => {
            'use server';
            await addJobInterviewRound(applicationId, fd);
          }}
          className="grid gap-2 border-t border-zinc-200 pt-3 sm:grid-cols-2"
        >
          <select
            name="kind"
            defaultValue="screening"
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
          >
            {JOB_INTERVIEW_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kindLabel(kind, t)}
              </option>
            ))}
          </select>
          <AssigneeSelect
            name="assignee"
            defaultValue={encodeInterviewAssignee({ kind: 'staff', id: currentUserId })}
            staff={staff}
            partners={partners}
            t={t}
          />
          <input
            name="title"
            maxLength={120}
            placeholder={t('ops.careers.interviewTitlePlaceholder')}
            className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm sm:col-span-2"
          />
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 sm:col-span-2"
          >
            {t('ops.careers.interviewAddRound')}
          </button>
        </ToastForm>
      </div>
    </details>
  );
}
