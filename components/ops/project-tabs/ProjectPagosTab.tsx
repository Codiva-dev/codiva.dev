import StatusBadge, { chargeTone } from '@/components/ops/StatusBadge';
import ToastForm from '@/components/ops/ToastForm';
import { getT } from '@/i18n/locale';
import { createProjectCharge, deleteProjectCharge, updateProjectCharge } from '@/lib/ops/actions';
import { isClientBorneChargeKind, labelsFor } from '@/lib/ops/labels';
import type { ChargeRow } from './types';

export default async function ProjectPagosTab({
  projectId,
  charges,
}: {
  projectId: string;
  charges: ChargeRow[];
}) {
  const t = await getT();
  const { CHARGE_KIND_LABELS, CHARGE_STATUS_LABELS, formatChargeAmount, formatDate } = labelsFor(t.locale);

  return (
<div className="space-y-6">
  <section className="rounded-xl border border-zinc-200 bg-white p-5">
    <h3 className="font-semibold">{t('ops.project.newCharge')}</h3>
    <p className="mt-1 text-sm text-zinc-500">
      {t('ops.project.chargeHint')}
    </p>
    <ToastForm success={t('ops.project.chargeCreated')}
      action={async (fd) => {
        'use server';
        await createProjectCharge(projectId, fd);
      }}
      className="mt-4 grid gap-3 md:grid-cols-2"
    >
      <input
        name="title"
        required
        placeholder={t('ops.project.concept')}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <select name="kind" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" defaultValue="development">
        {Object.entries(CHARGE_KIND_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input
        name="amount"
        type="number"
        min="0"
        step="0.01"
        placeholder={t('ops.project.amountOptional')}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <select name="status" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" defaultValue="pending">
        {Object.entries(CHARGE_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <input name="periodLabel" placeholder={t('ops.project.period')} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      <input name="dueDate" type="date" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
      <input
        name="noticeDays"
        type="number"
        min="0"
        defaultValue={30}
        placeholder={t('ops.project.noticeDays')}
        className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <p className="text-xs text-zinc-500 md:col-span-1">
        {t('ops.project.noticeHint')}
      </p>
      <textarea
        name="description"
        rows={2}
        placeholder={t('ops.project.descClient')}
        className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <textarea
        name="staffNotes"
        rows={2}
        placeholder={t('ops.project.staffNotes')}
        className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-zinc-700 md:col-span-2">
        <input type="checkbox" name="visibleToClient" value="on" defaultChecked />
        {t('ops.project.visiblePortalCosts')}
      </label>
      <button type="submit" className="w-fit rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white">
        {t('ops.project.addCharge')}
      </button>
    </ToastForm>
  </section>

  {(charges ?? []).map((c) => (
    <article key={c.id} className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={CHARGE_STATUS_LABELS[c.status]} tone={chargeTone(c.status)} />
          <span className="text-xs uppercase tracking-wide text-zinc-500">
            {CHARGE_KIND_LABELS[c.kind] ?? c.kind}
          </span>
          {isClientBorneChargeKind(c.kind) && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
              {t('ops.project.clientBorne')}
            </span>
          )}
        </div>
        <p className="font-semibold text-codiva-primary">
          {formatChargeAmount(c.amount, c.currency)}
        </p>
      </div>
      <ToastForm success={t('ops.project.chargeUpdated')}
        action={async (fd) => {
          'use server';
          await updateProjectCharge(c.id, projectId, fd);
        }}
        className="grid gap-3 md:grid-cols-2"
      >
        <input type="hidden" name="existingPaidAt" value={c.paid_at ?? ''} />
        <input
          name="title"
          required
          defaultValue={c.title}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <select name="kind" defaultValue={c.kind} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          {Object.entries(CHARGE_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="amount"
          type="number"
          min="0"
          step="0.01"
          defaultValue={c.amount ?? ''}
          placeholder={t('ops.project.amountTbd')}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={c.status} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          {Object.entries(CHARGE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          name="periodLabel"
          defaultValue={c.period_label ?? ''}
          placeholder={t('ops.project.periodShort')}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          name="dueDate"
          type="date"
          defaultValue={c.due_date ?? ''}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <input
          name="noticeDays"
          type="number"
          min="0"
          defaultValue={c.notice_days ?? 30}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          title={t('ops.project.noticeTitle')}
        />
        <textarea
          name="description"
          rows={2}
          defaultValue={c.description ?? ''}
          className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <textarea
          name="staffNotes"
          rows={2}
          defaultValue={c.staff_notes ?? ''}
          placeholder={t('ops.project.staffNotesShort')}
          className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" name="visibleToClient" defaultChecked={c.visible_to_client !== false} />
          {t('ops.project.visiblePortal')}
        </label>
        <p className="text-xs text-zinc-500">
          {c.status === 'paid' ? t('ops.project.paidOn', { date: formatDate(c.paid_at) }) : c.due_date ? t('ops.project.dueOn', { date: formatDate(c.due_date) }) : t('ops.project.noDue')}
        </p>
        <div className="flex flex-wrap items-center gap-2 md:col-span-2">
          <button type="submit" className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm text-white">
            {t('ops.project.save')}
          </button>
          <p className="text-xs text-zinc-500">
            {t('ops.project.chargeDeleteHint')}
          </p>
        </div>
      </ToastForm>
      <ToastForm success={t('ops.project.deleted')}
        action={async () => {
          'use server';
          await deleteProjectCharge(c.id, projectId);
        }}
        className="mt-3 border-t border-zinc-100 pt-3"
      >
        <button
          type="submit"
          className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
        >
          {t('ops.project.deleteCharge')}
        </button>
      </ToastForm>
    </article>
  ))}
  {!charges?.length && <p className="text-sm text-zinc-500">{t('ops.project.noCharges')}</p>}
</div>
  );
}
