import Link from 'next/link';
import InterviewsChrome from '@/components/ops/InterviewsChrome';
import StatusBadge from '@/components/ops/StatusBadge';
import { requireInterviewsAccess } from '@/lib/ops/auth';
import { getAcceptanceStatus } from '@/lib/ops/legal/acceptances';
import {
  listFailedInterviewAttempts,
  listInterviewQueue,
  partitionInterviewQueue,
  type InterviewFailedAttemptRow,
  type InterviewQueueRow,
} from '@/lib/ops/interview-query';
import { interviewsHref } from '@/lib/ops/interview-view-as';
import { getT, type Translator } from '@/i18n/locale';
import { isDiscardedApplicationStatus, jobApplicationStatusLabel } from '@/lib/ops/careers';
import { redirect } from 'next/navigation';

function followUpTone(value: string) {
  if (value === 'pending') return 'warning' as const;
  if (value === 'needs_report') return 'info' as const;
  return 'success' as const;
}

function applicationTone(status: string) {
  if (isDiscardedApplicationStatus(status)) return 'danger' as const;
  if (status === 'hired') return 'success' as const;
  return 'info' as const;
}

function CandidateCards({
  rows,
  homeHref,
  t,
}: {
  rows: InterviewQueueRow[];
  homeHref: string;
  t: Translator;
}) {
  return (
    <ul className="mt-6 space-y-3">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={homeHref === '/' ? `/${row.id}` : `${homeHref}/${row.id}`}
            className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-codiva-primary/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900">{row.full_name}</p>
                {row.jobTitle ? <p className="text-sm text-codiva-primary">{row.jobTitle}</p> : null}
                <p className="mt-1 text-sm text-zinc-500">{row.email}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge
                  label={jobApplicationStatusLabel(row.status, t.locale)}
                  tone={applicationTone(row.status)}
                />
                <StatusBadge
                  label={
                    row.followUp === 'pending'
                      ? t('interviews.followUpPending')
                      : row.followUp === 'needs_report'
                        ? t('interviews.followUpReport')
                        : t('interviews.followUpClosed')
                  }
                  tone={followUpTone(row.followUp)}
                />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FailedAttemptCards({
  rows,
  intentoBase,
  t,
}: {
  rows: InterviewFailedAttemptRow[];
  intentoBase: string;
  t: Translator;
}) {
  return (
    <ul className="mt-6 space-y-3">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`${intentoBase}/${row.id}`}
            className="block rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-codiva-primary/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-zinc-900">{row.full_name}</p>
                {row.jobTitle ? <p className="text-sm text-codiva-primary">{row.jobTitle}</p> : null}
                <p className="mt-1 text-sm text-zinc-500">{row.email}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusBadge
                  label={
                    row.status === 'expired' ? t('interviews.expiredBadge') : t('interviews.failedBadge')
                  }
                  tone="danger"
                />
                {row.scorePct != null ? (
                  <StatusBadge label={`${row.scorePct}%`} tone="neutral" />
                ) : null}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function InterviewsQueuePage() {
  const access = await requireInterviewsAccess();
  if (!access.isStaffPreview && access.member && !getAcceptanceStatus(access.member).complete) {
    redirect(await interviewsHref('/aceptar'));
  }
  const t = await getT();
  const [rows, failed] = await Promise.all([
    listInterviewQueue({
      isStaffPreview: access.isStaffPreview,
      member: access.member,
    }),
    listFailedInterviewAttempts({ member: access.member }),
  ]);
  const { open, rejected } = partitionInterviewQueue(rows);
  const homeHref = await interviewsHref('/');
  const intentoBase = await interviewsHref('/intento');
  const empty = open.length === 0 && rejected.length === 0 && failed.length === 0;

  return (
    <InterviewsChrome
      isStaffPreview={access.isStaffPreview}
      orgName={access.partner?.name}
      viewAsName={access.isStaffPreview ? access.member?.full_name : null}
    >
      <h1 className="text-xl font-bold text-zinc-900">{t('interviews.queue')}</h1>
      {empty ? (
        <p className="mt-6 text-sm text-zinc-600">{t('interviews.queueEmpty')}</p>
      ) : (
        <>
          {open.length ? <CandidateCards rows={open} homeHref={homeHref} t={t} /> : null}
          {failed.length ? (
            <section className={open.length ? 'mt-10' : 'mt-6'}>
              <h2 className="text-lg font-semibold text-zinc-900">{t('interviews.failedTitle')}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t('interviews.failedHint')}</p>
              <FailedAttemptCards rows={failed} intentoBase={intentoBase} t={t} />
            </section>
          ) : null}
          {rejected.length ? (
            <section className={open.length || failed.length ? 'mt-10' : 'mt-6'}>
              <h2 className="text-lg font-semibold text-zinc-900">{t('interviews.rejectedTitle')}</h2>
              <p className="mt-1 text-sm text-zinc-500">{t('interviews.rejectedHint')}</p>
              <CandidateCards rows={rejected} homeHref={homeHref} t={t} />
            </section>
          ) : null}
        </>
      )}
    </InterviewsChrome>
  );
}
