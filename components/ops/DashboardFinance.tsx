'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import StatusBadge, { chargeTone, projectTone } from '@/components/ops/StatusBadge';
import { filterFinanceOrgsByQuery, type FinanceFilters, type FinanceSummary } from '@/lib/ops/finance';
import { labelsFor } from '@/lib/ops/labels';
import { OPS_HOME_PATH } from '@/lib/ops/home';
import { opsProjectPath } from '@/lib/ops/project-path';

export default function DashboardFinance({
  summary,
  filters,
  action = OPS_HOME_PATH,
}: {
  summary: FinanceSummary;
  filters: FinanceFilters;
  action?: string;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en' : 'es';
  const {
    formatCurrency,
    formatDate,
    formatChargeAmount,
    CHARGE_KIND_LABELS,
    CHARGE_STATUS_LABELS,
    PROJECT_STATUS_LABELS,
  } = labelsFor(locale);

  const CHARGE_STATUS_FILTERS: { value: string; label: string }[] = [
    { value: '', label: t('ops.pages.financeAllCharges') },
    { value: 'outstanding', label: t('ops.pages.financeOutstanding') },
    { value: 'pending', label: CHARGE_STATUS_LABELS.pending },
    { value: 'overdue', label: CHARGE_STATUS_LABELS.overdue },
    { value: 'paid', label: CHARGE_STATUS_LABELS.paid },
    { value: 'waived', label: CHARGE_STATUS_LABELS.waived },
  ];

  const KIND_FILTERS: { value: string; label: string }[] = [
    { value: '', label: t('ops.pages.financeAllKinds') },
    ...Object.entries(CHARGE_KIND_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const PROJECT_STATUS_FILTERS: { value: string; label: string }[] = [
    { value: '', label: t('ops.pages.financeAllProjects') },
    ...Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  const hasFilters = Boolean(
    filters.org || filters.chargeStatus || filters.kind || filters.projectStatus
  );
  const [expanded, setExpanded] = useState(hasFilters);
  const [query, setQuery] = useState('');
  const visibleOrgs = useMemo(
    () => filterFinanceOrgsByQuery(summary.orgs, query),
    [summary.orgs, query]
  );

  function money(amount: number, tbdCount = 0) {
    return (
      <>
        {formatChargeAmount(amount, 'MXN')}
        {tbdCount > 0 ? (
          <span className="ml-1 text-xs font-medium text-amber-700">(+{tbdCount} TBD)</span>
        ) : null}
      </>
    );
  }

  const overdueLabel =
    summary.overdueCount === 1
      ? t('ops.pendientes.financeOverdue', { count: summary.overdueCount })
      : t('ops.pendientes.financeOverdue_other', { count: summary.overdueCount });

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900">{t('ops.pendientes.financeTitle')}</h2>
          {!expanded ? (
            <p className="mt-1 truncate text-xs text-zinc-600">
              {t('ops.pendientes.financeOutstandingKpi')} {formatChargeAmount(summary.outstanding, 'MXN')}
              {' · '}
              {t('ops.pendientes.financePaidKpi')} {formatChargeAmount(summary.paid, 'MXN')}
              {' · '}
              {summary.orgs.length} {t('ops.pendientes.financeClientsKpi').toLowerCase()}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {hasFilters ? (
            <Link href={action} className="text-xs font-medium text-codiva-primary hover:underline">
              {t('ops.pendientes.financeClear')}
            </Link>
          ) : null}
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800"
            aria-expanded={expanded}
            aria-label={expanded ? t('ops.pendientes.financeCollapseAria') : t('ops.pendientes.financeExpandAria')}
            onClick={() => setExpanded((current) => !current)}
          >
            <ChevronDown className={`h-4 w-4 transition ${expanded ? 'rotate-180' : ''}`} aria-hidden />
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800/80">
                {t('ops.pendientes.financeOutstandingKpi')}
              </p>
              <p className="mt-1 text-sm font-bold text-amber-900">{money(summary.outstanding, summary.tbdCount)}</p>
              <p className="mt-0.5 text-[11px] text-amber-800/70">{overdueLabel}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800/80">
                {t('ops.pendientes.financePaidKpi')}
              </p>
              <p className="mt-1 text-sm font-bold text-emerald-900">{formatChargeAmount(summary.paid, 'MXN')}</p>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-800/80">
                {t('ops.pendientes.financeProjectsKpi')}
              </p>
              <p className="mt-1 text-sm font-bold text-sky-900">{formatCurrency(summary.quoteTotal, 'MXN')}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                {t('ops.pendientes.financeClientsKpi')}
              </p>
              <p className="mt-1 text-sm font-bold text-zinc-900">{summary.orgs.length}</p>
            </div>
          </div>

          <label className="relative block">
            <span className="sr-only">{t('ops.pendientes.financeSearch')}</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('ops.pendientes.financeSearch')}
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-codiva-primary focus:ring-2 focus:ring-codiva-primary/20"
            />
          </label>

          <details className="group" open={hasFilters || undefined}>
            <summary className="cursor-pointer list-none text-sm font-medium text-zinc-700 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1">
                {t('ops.pendientes.financeMoreFilters')}
                <span className="text-zinc-400 transition group-open:rotate-90">›</span>
              </span>
            </summary>
            <form method="get" action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-600">
                {t('ops.pendientes.financeClient')}
                <select
                  name="org"
                  defaultValue={filters.org ?? ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  <option value="">{t('ops.pendientes.financeAllClients')}</option>
                  {summary.orgOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                {t('ops.pendientes.financeChargeStatus')}
                <select
                  name="chargeStatus"
                  defaultValue={filters.chargeStatus ?? ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  {CHARGE_STATUS_FILTERS.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                {t('ops.pendientes.financeChargeKind')}
                <select
                  name="kind"
                  defaultValue={filters.kind ?? ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  {KIND_FILTERS.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-zinc-600">
                {t('ops.pendientes.financeProjectStatus')}
                <select
                  name="projectStatus"
                  defaultValue={filters.projectStatus ?? ''}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                >
                  {PROJECT_STATUS_FILTERS.map((o) => (
                    <option key={o.value || 'all'} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
                >
                  {t('ops.pendientes.financeApply')}
                </button>
              </div>
            </form>
          </details>

          {!visibleOrgs.length ? (
            <p className="text-sm text-zinc-500">{t('ops.pendientes.financeEmpty')}</p>
          ) : (
            <div className="space-y-4">
              {visibleOrgs.map((org) => (
                <div key={org.orgId} className="overflow-hidden rounded-xl border border-zinc-200">
                  <div className="flex flex-col gap-2 border-b border-zinc-100 bg-zinc-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
                    <h3 className="font-semibold text-zinc-900">{org.orgName}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                      <span>
                        {t('ops.pendientes.financeOutstandingKpi')}:{' '}
                        <span className="font-semibold text-amber-800">{money(org.outstanding, org.tbdCount)}</span>
                      </span>
                      <span>
                        {t('ops.pendientes.financePaidKpi')}:{' '}
                        <span className="font-semibold text-emerald-800">{formatChargeAmount(org.paid, 'MXN')}</span>
                      </span>
                      <span>
                        {t('ops.pendientes.financeProjectsKpi')}:{' '}
                        <span className="font-semibold text-sky-800">{formatCurrency(org.quoteTotal, 'MXN')}</span>
                      </span>
                    </div>
                  </div>

                  <ul className="divide-y divide-zinc-100">
                    {org.projects.map((project) => (
                      <li key={project.projectId} className="px-3 py-3 sm:px-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={opsProjectPath(project.projectSlug, '?tab=pagos')}
                                className="font-medium hover:text-codiva-primary"
                              >
                                {project.projectName}
                              </Link>
                              <StatusBadge
                                label={PROJECT_STATUS_LABELS[project.projectStatus] ?? project.projectStatus}
                                tone={projectTone(project.projectStatus)}
                              />
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                              <span>
                                {t('ops.pendientes.financeOutstandingKpi')}: {money(project.outstanding, project.tbdCount)}
                              </span>
                              <span>
                                {t('ops.pendientes.financePaidKpi')}: {formatChargeAmount(project.paid, 'MXN')}
                              </span>
                              <span>
                                {t('ops.pendientes.financeProjectsKpi')}: {formatCurrency(project.quoteTotal, 'MXN')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {project.charges.length > 0 ? (
                          <ul className="mt-3 space-y-1.5">
                            {project.charges.map((c) => (
                              <li
                                key={c.id}
                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs"
                              >
                                <div className="min-w-0">
                                  <span className="font-medium text-zinc-800">{c.title}</span>
                                  <span className="text-zinc-400"> · </span>
                                  <span className="text-zinc-500">{CHARGE_KIND_LABELS[c.kind] ?? c.kind}</span>
                                  {c.due_date ? (
                                    <>
                                      <span className="text-zinc-400"> · </span>
                                      <span className="text-zinc-500">
                                        {t('ops.pendientes.financeDue', { date: formatDate(c.due_date) })}
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-800">
                                    {formatChargeAmount(c.amount, c.currency)}
                                  </span>
                                  <StatusBadge
                                    label={CHARGE_STATUS_LABELS[c.status] ?? c.status}
                                    tone={chargeTone(c.status)}
                                  />
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-zinc-500">{t('ops.pendientes.financeNoCharges')}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
