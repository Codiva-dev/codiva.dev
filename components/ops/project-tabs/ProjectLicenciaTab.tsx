import ToastForm from '@/components/ops/ToastForm';
import { getT } from '@/i18n/locale';
import {
  ensureSaasInstance,
  saveSaasInstance,
  saveSaasVendorSlot,
  setSaasStatus,
  signAndPushSaasLicense,
  requestInstanceCincelOtp,
  exchangeInstanceCincelOtp,
  watchInstanceCincelJwt,
} from '@/lib/ops/actions/saas-license';
import { readInstanceCincelStatus } from '@/lib/ops/saas-instance-http';
import { LICENSE_MODULES, LICENSE_STATUSES, vendorSlotIsDue } from '@/lib/ops/saas-license';

type InstanceRow = {
  id: string;
  instance_key: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  grace_until: string | null;
  modules: string[] | null;
  entitlement_token: string | null;
  instance_push_url: string | null;
  notes: string;
  last_pushed_at: string | null;
};

type CounterRow = { period_label: string; meter: string; quantity: number };
type VendorRow = {
  slot: string;
  expires_at: string | null;
  last_error: string | null;
  last_checked_at: string | null;
  notes: string;
};

export default async function ProjectLicenciaTab({
  projectId,
  projectSlug,
  instance,
  counters,
  vendors,
}: {
  projectId: string;
  projectSlug: string;
  instance: InstanceRow | null;
  counters: CounterRow[];
  vendors: VendorRow[];
}) {
  const t = await getT();
  const cincelLive = instance
    ? await readInstanceCincelStatus(instance.instance_push_url)
    : null;
  if (!instance) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">{t('ops.license.emptyTitle')}</h3>
        <p className="mt-2 text-sm text-zinc-500">{t('ops.license.emptyHint')}</p>
        <ToastForm
          success={t('ops.license.created')}
          action={async () => {
            'use server';
            await ensureSaasInstance(projectId, projectSlug);
          }}
          className="mt-4"
        >
          <button type="submit" className="rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white">
            {t('ops.license.create')}
          </button>
        </ToastForm>
      </section>
    );
  }

  const modules = new Set(instance.modules ?? []);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">{t('ops.license.title')}</h3>
          <p className="text-sm uppercase tracking-wide text-zinc-500">{instance.status}</p>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {LICENSE_STATUSES.map((status) => (
            <ToastForm
              key={status}
              success={t('ops.license.statusSaved')}
              action={async () => {
                'use server';
                await setSaasStatus(projectId, status);
              }}
            >
              <button
                type="submit"
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  instance.status === status
                    ? 'bg-codiva-primary text-white'
                    : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {t(`ops.license.status.${status}`)}
              </button>
            </ToastForm>
          ))}
        </div>
        <ToastForm
          success={t('ops.license.saved')}
          action={async (fd) => {
            'use server';
            await saveSaasInstance(projectId, fd);
          }}
          className="grid gap-3 md:grid-cols-2"
        >
          <label className="text-sm">
            {t('ops.license.instanceKey')}
            <input
              name="instanceKey"
              defaultValue={instance.instance_key}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            {t('ops.license.pushUrl')}
            <input
              name="instancePushUrl"
              defaultValue={instance.instance_push_url ?? ''}
              placeholder="https://app…/api/internal/codiva-license"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            {t('ops.license.periodStart')}
            <input
              name="periodStart"
              type="date"
              defaultValue={instance.period_start ?? ''}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            {t('ops.license.periodEnd')}
            <input
              name="periodEnd"
              type="date"
              defaultValue={instance.period_end ?? ''}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            {t('ops.license.graceUntil')}
            <input
              name="graceUntil"
              type="date"
              defaultValue={instance.grace_until ?? ''}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <input type="hidden" name="status" value={instance.status} />
          <fieldset className="md:col-span-2">
            <legend className="text-sm font-medium">{t('ops.license.modules')}</legend>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              {LICENSE_MODULES.map((mod) => (
                <label key={mod} className="flex items-center gap-2">
                  <input type="checkbox" name="modules" value={mod} defaultChecked={modules.has(mod)} />
                  {mod}
                </label>
              ))}
            </div>
          </fieldset>
          <textarea
            name="notes"
            rows={2}
            defaultValue={instance.notes}
            placeholder={t('ops.license.notes')}
            className="md:col-span-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button type="submit" className="w-fit rounded-lg bg-codiva-primary px-4 py-2 text-sm font-semibold text-white">
            {t('ops.license.save')}
          </button>
        </ToastForm>
        <ToastForm
          success={t('ops.license.signed')}
          action={async () => {
            'use server';
            await signAndPushSaasLicense(projectId);
          }}
          className="mt-4"
        >
          <button type="submit" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium">
            {t('ops.license.signPush')}
          </button>
        </ToastForm>
        {instance.last_pushed_at ? (
          <p className="mt-2 text-xs text-zinc-500">
            {t('ops.license.lastPushed')}: {instance.last_pushed_at}
          </p>
        ) : null}
        {instance.entitlement_token ? (
          <p className="mt-2 break-all font-mono text-[11px] text-zinc-500">{instance.entitlement_token}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">{t('ops.license.usage')}</h3>
        <p className="mt-1 text-sm text-zinc-500">{t('ops.license.usageHint')}</p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {counters.length === 0 ? (
            <li className="text-sm text-zinc-500">{t('ops.license.usageEmpty')}</li>
          ) : (
            counters.map((row) => (
              <li key={`${row.period_label}-${row.meter}`} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
                <span className="font-medium">{row.meter}</span>
                <span className="ml-2 text-zinc-500">{row.period_label}</span>
                <span className="float-right font-semibold">{row.quantity}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <h3 className="font-semibold">{t('ops.license.vendors')}</h3>
        <p className="mt-1 text-sm text-zinc-500">{t('ops.license.vendorsHint')}</p>
        <div className="mt-4 grid gap-4">
          {['cincel', 'idse', 'stp'].map((slot) => {
            const row = vendors.find((item) => item.slot === slot);
            const due = vendorSlotIsDue(row?.expires_at);
            return (
              <article key={slot} className="rounded-lg border border-zinc-200 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium uppercase">{slot}</p>
                  {due ? (
                    <span className="text-xs font-semibold text-red-600">{t('ops.license.vendorDue')}</span>
                  ) : null}
                </div>
                <ToastForm
                  success={t('ops.license.vendorSaved')}
                  action={async (fd) => {
                    'use server';
                    await saveSaasVendorSlot(projectId, slot, fd);
                  }}
                  className="grid gap-2 md:grid-cols-2"
                >
                  <input
                    name="expiresAt"
                    type="datetime-local"
                    defaultValue={row?.expires_at ? row.expires_at.slice(0, 16) : ''}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <input
                    name="notes"
                    defaultValue={row?.notes ?? ''}
                    placeholder={t('ops.license.vendorNotes')}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                  <button type="submit" className="w-fit rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                    {t('ops.license.vendorSave')}
                  </button>
                </ToastForm>
                {row?.last_error ? <p className="mt-2 text-xs text-amber-800">{row.last_error}</p> : null}
                {slot === 'cincel' ? (
                  <div className="mt-4 space-y-3 border-t border-zinc-200 pt-4">
                    <p className="text-sm text-zinc-600">{t('ops.license.vendorCincelHint')}</p>
                    {cincelLive ? (
                      <p className="text-xs text-zinc-500">
                        {t('ops.license.vendorCincelLive')}: {cincelLive.expiresAt || '—'}
                        {cincelLive.lastError ? ` · ${cincelLive.lastError}` : ''}
                        {cincelLive.hasPendingOtp ? ` · ${t('ops.license.vendorOtpPending')}` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-zinc-500">{t('ops.license.vendorCincelOffline')}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <ToastForm
                        success={t('ops.license.vendorOtpRequested')}
                        action={async () => {
                          'use server';
                          await requestInstanceCincelOtp(projectId);
                        }}
                      >
                        <button type="submit" className="rounded-lg bg-codiva-primary px-3 py-2 text-sm font-semibold text-white">
                          {t('ops.license.vendorOtpRequest')}
                        </button>
                      </ToastForm>
                      <ToastForm
                        success={t('ops.license.vendorJwtWatched')}
                        action={async () => {
                          'use server';
                          await watchInstanceCincelJwt(projectId);
                        }}
                      >
                        <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                          {t('ops.license.vendorJwtWatch')}
                        </button>
                      </ToastForm>
                    </div>
                    <ToastForm
                      success={t('ops.license.vendorOtpExchanged')}
                      action={async (fd) => {
                        'use server';
                        await exchangeInstanceCincelOtp(projectId, fd);
                      }}
                      className="flex flex-wrap items-end gap-2"
                    >
                      <label className="text-sm">
                        {t('ops.license.vendorOtpCode')}
                        <input
                          name="code"
                          required
                          autoComplete="one-time-code"
                          inputMode="numeric"
                          className="mt-1 block rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                        />
                      </label>
                      <button type="submit" className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium">
                        {t('ops.license.vendorOtpExchange')}
                      </button>
                    </ToastForm>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
