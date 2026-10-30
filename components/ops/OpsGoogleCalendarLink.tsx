import Link from 'next/link';
import ToastForm from '@/components/ops/ToastForm';
import { disconnectGoogleCalendar } from '@/lib/ops/google-calendar-actions';

type Status =
  | { configured: false; linked: false }
  | { configured: true; linked: false }
  | {
      configured: true;
      linked: true;
      googleEmail: string;
      linkedAt: string;
      lastError: string | null;
    };

type Labels = {
  title: string;
  hint: string;
  notConfigured: string;
  account: string;
  linkedHint: string;
  syncError: (error: string) => string;
  disconnect: string;
  disconnected: string;
  connectHint: string;
  connect: string;
  flash: string | null;
};

export default function OpsGoogleCalendarLink({
  status,
  labels,
}: {
  status: Status;
  labels: Labels;
}) {
  return (
    <section id="google-calendar" className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="mb-1 font-semibold">{labels.title}</h2>
      <p className="mb-4 text-sm text-zinc-600">{labels.hint}</p>

      {labels.flash ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{labels.flash}</p>
      ) : null}

      {!status.configured ? (
        <p className="text-sm text-zinc-500">{labels.notConfigured}</p>
      ) : status.linked ? (
        <div className="space-y-3">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">{labels.account}</dt>
              <dd>{status.googleEmail}</dd>
            </div>
          </dl>
          {status.lastError ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {labels.syncError(status.lastError)}
            </p>
          ) : (
            <p className="text-sm text-zinc-600">{labels.linkedHint}</p>
          )}
          <ToastForm success={labels.disconnected} action={disconnectGoogleCalendar} className="inline-block">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
            >
              {labels.disconnect}
            </button>
          </ToastForm>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-600">{labels.connectHint}</p>
          <Link
            href="/api/ops/google-calendar/oauth/start"
            className="inline-block rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white"
          >
            {labels.connect}
          </Link>
        </div>
      )}
    </section>
  );
}
