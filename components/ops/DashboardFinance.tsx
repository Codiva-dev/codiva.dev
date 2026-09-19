import Link from 'next/link';
import StatusBadge, { chargeTone, projectTone } from '@/components/ops/StatusBadge';
import type { FinanceFilters, FinanceSummary } from '@/lib/ops/finance';
import { labelsFor } from '@/lib/ops/labels';
import { getT } from '@/i18n/locale';
import { OPS_HOME_PATH } from '@/lib/ops/home';
import { opsProjectPath } from '@/lib/ops/project-path';

export default async function DashboardFinance({
  summary,
  filters,
  action = OPS_HOME_PATH,
}: {
  summary: FinanceSummary;
  filters: FinanceFilters;
  action?: string;
}) {
  const t = await getT();
  const {
    formatCurrency,
    formatDate,
    formatChargeAmount,
    CHARGE_KIND_LABELS,
    CHARGE_STATUS_LABELS,
    PROJECT_STATUS_LABELS,
  } = labelsFor(t.locale);

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
  const hasFilters = Boolean(
    filters.org || filters.chargeStatus || filters.kind || filters.projectStatus
  );

  return (
    <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-semibold">Finanzas</h2>
          <p className="text-sm text-zinc-500">
            Adeudos y totales de proyecto por cliente. Segmenta con los filtros.
          </p>
        </div>
        {hasFilters ? (
          <Link href={action} className="text-sm text-codiva-primary hover:underline">
            Limpiar filtros
          </Link>
        ) : null}
      </div>

      <form method="get" action={action} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="block text-xs font-medium text-zinc-600">
          Cliente
          <select
            name="org"
            defaultValue={filters.org ?? ''}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {summary.orgOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-medium text-zinc-600">
          Estado del cargo
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
          Tipo de cargo
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
          Estado del proyecto
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
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
          >
            Aplicar
          </button>
        </div>
      </form>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800/80">
            Adeudo total
          </p>
          <p className="mt-2 text-xl font-bold text-amber-900">
            {money(summary.outstanding, summary.tbdCount)}
          </p>
          <p className="mt-1 text-xs text-amber-800/70">
            {summary.overdueCount} vencido{summary.overdueCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800/80">
            Cobrado
          </p>
          <p className="mt-2 text-xl font-bold text-emerald-900">
            {formatChargeAmount(summary.paid, 'MXN')}
          </p>
          <p className="mt-1 text-xs text-emerald-800/70">
            {summary.chargeCount} cargo{summary.chargeCount === 1 ? '' : 's'} en vista
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-800/80">
            Totales de proyecto
          </p>
          <p className="mt-2 text-xl font-bold text-sky-900">
            {formatCurrency(summary.quoteTotal, 'MXN')}
          </p>
          <p className="mt-1 text-xs text-sky-800/70">{t('ops.pages.financeQuoteHint')}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Clientes
          </p>
          <p className="mt-2 text-xl font-bold text-zinc-900">{summary.orgs.length}</p>
          <p className="mt-1 text-xs text-zinc-500">Con actividad financiera en el filtro</p>
        </div>
      </div>

      {!summary.orgs.length ? (
        <p className="text-sm text-zinc-500">
          No hay cargos ni totales de proyecto para estos filtros.
        </p>
      ) : (
        <div className="space-y-4">
          {summary.orgs.map((org) => (
            <div key={org.orgId} className="overflow-hidden rounded-xl border border-zinc-200">
              <div className="flex flex-col gap-2 border-b border-zinc-100 bg-zinc-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-semibold text-zinc-900">{org.orgName}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600">
                  <span>
                    Adeudo:{' '}
                    <span className="font-semibold text-amber-800">
                      {money(org.outstanding, org.tbdCount)}
                    </span>
                  </span>
                  <span>
                    Cobrado:{' '}
                    <span className="font-semibold text-emerald-800">
                      {formatChargeAmount(org.paid, 'MXN')}
                    </span>
                  </span>
                  <span>
                    Proyecto(s):{' '}
                    <span className="font-semibold text-sky-800">
                      {formatCurrency(org.quoteTotal, 'MXN')}
                    </span>
                  </span>
                </div>
              </div>

              <ul className="divide-y divide-zinc-100">
                {org.projects.map((project) => (
                  <li key={project.projectId} className="px-4 py-3">
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
                          <span>Adeudo: {money(project.outstanding, project.tbdCount)}</span>
                          <span>Cobrado: {formatChargeAmount(project.paid, 'MXN')}</span>
                          <span>Total proyecto: {formatCurrency(project.quoteTotal, 'MXN')}</span>
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
                              <span className="text-zinc-500">
                                {CHARGE_KIND_LABELS[c.kind] ?? c.kind}
                              </span>
                              {c.due_date ? (
                                <>
                                  <span className="text-zinc-400"> · </span>
                                  <span className="text-zinc-500">vence {formatDate(c.due_date)}</span>
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
                      <p className="mt-2 text-xs text-zinc-500">Sin cargos en este filtro.</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
