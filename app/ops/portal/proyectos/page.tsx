import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PortalProjectsSignOut from '@/components/ops/PortalProjectsSignOut';
import StatusBadge, { projectTone } from '@/components/ops/StatusBadge';
import {
  enrichPortalProjectHubCards,
  listPortalProjectsForUser,
  requirePortalUser,
} from '@/lib/ops/auth';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import CodivaWordmarkMark from '@/components/CodivaWordmarkMark';

function milestoneTone(status: string) {
  const map: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
    pending: 'neutral',
    in_progress: 'info',
    completed: 'success',
    blocked: 'danger',
  };
  return map[status] ?? 'neutral';
}

export default async function PortalProyectosPage() {
  const { user, supabase } = await requirePortalUser();
  const t = await getT();
  const { MILESTONE_STATUS_LABELS, PROJECT_STATUS_LABELS, formatCurrency, formatDate } = labelsFor(
    t.locale
  );
  const base = await listPortalProjectsForUser(supabase, user.id);

  if (base.length === 1) {
    redirect(`/p/${base[0].slug}`);
  }

  const projects = await enrichPortalProjectHubCards(supabase, base);

  return (
    <div className="min-h-screen bg-codiva-background">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Image src="/logo.svg" alt="Codiva" width={32} height={32} />
            <div className="min-w-0">
              <CodivaWordmarkMark size="sm" />
              <h1 className="break-words text-xl font-bold text-zinc-900">{t('portal.hub.title')}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link href="/cuenta" className="text-sm text-zinc-500 hover:text-zinc-800">
              {t('portal.account.nav')}
            </Link>
            <LanguageSwitcher />
            <PortalProjectsSignOut />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-sm text-zinc-600">{t('portal.hub.empty')}</p>
            <Link href="/login" className="mt-4 inline-block text-sm text-codiva-primary hover:underline">
              {t('portal.hub.backLogin')}
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/p/${p.slug}`}
                  className="block rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-codiva-primary/40 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-zinc-900">{p.name}</h2>
                    <StatusBadge
                      label={PROJECT_STATUS_LABELS[p.status] ?? p.status}
                      tone={projectTone(p.status)}
                    />
                  </div>
                  {p.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600">{p.description}</p>
                  ) : null}

                  <div className="mt-4">
                    <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                      <span>{t('portal.hub.progress')}</span>
                      <span>{p.progress_percent}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-codiva-primary"
                        style={{ width: `${Math.min(100, Math.max(0, p.progress_percent))}%` }}
                      />
                    </div>
                  </div>

                  <dl className="mt-4 space-y-2 border-t border-zinc-100 pt-4 text-sm">
                    {p.portal_show_costs ? (
                      <div className="flex items-baseline justify-between gap-3">
                        <dt className="text-zinc-500">{t('portal.hub.pendingPay')}</dt>
                        <dd
                          className={
                            (p.pendingAmount ?? 0) > 0
                              ? 'font-semibold text-amber-800'
                              : 'font-medium text-zinc-900'
                          }
                        >
                          {formatCurrency(p.pendingAmount ?? 0, p.pendingCurrency)}
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex items-start justify-between gap-3">
                      <dt className="shrink-0 text-zinc-500">{t('portal.hub.nextMilestone')}</dt>
                      <dd className="min-w-0 text-right">
                        {p.nextMilestone ? (
                          <div className="space-y-1">
                            <p className="font-medium text-zinc-900">{p.nextMilestone.title}</p>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <StatusBadge
                                label={
                                  MILESTONE_STATUS_LABELS[p.nextMilestone.status] ??
                                  p.nextMilestone.status
                                }
                                tone={milestoneTone(p.nextMilestone.status)}
                              />
                              {p.nextMilestone.due_date ? (
                                <span className="text-xs text-zinc-500">
                                  {formatDate(p.nextMilestone.due_date)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : (
                          <span className="text-zinc-500">{t('portal.hub.noMilestones')}</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-4 text-sm font-medium text-codiva-primary">{t('portal.hub.open')}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
