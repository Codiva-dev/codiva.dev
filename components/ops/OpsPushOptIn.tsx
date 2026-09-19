'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { toUserErrorMessage } from '@/lib/user-error';

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

async function swRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/ops-sw.js', { scope: '/' });
}

async function currentSubscription() {
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  return reg?.pushManager.getSubscription() ?? null;
}

export async function ensureOpsPushSubscription(vapidPublicKey: string) {
  if (!vapidPublicKey || typeof Notification === 'undefined') return false;
  if (Notification.permission !== 'granted') return false;
  const reg = await swRegistration();
  if (!reg?.pushManager) return false;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    }));
  const res = await fetch('/api/ops/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) throw new Error('No se pudo guardar la suscripción');
  return true;
}

export function OpsPushRegister({ vapidPublicKey }: { vapidPublicKey: string }) {
  useEffect(() => {
    if (!vapidPublicKey) return;
    void ensureOpsPushSubscription(vapidPublicKey).catch((error) => {
      console.error('ops push register', error);
    });
  }, [vapidPublicKey]);
  return null;
}

export default function OpsPushOptIn({ vapidPublicKey }: { vapidPublicKey: string }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'off' | 'on' | 'denied' | 'missing'>('off');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vapidPublicKey || typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setStatus('missing');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    void currentSubscription().then((sub) => {
      setStatus(sub && Notification.permission === 'granted' ? 'on' : 'off');
    });
  }, [vapidPublicKey]);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }
      await ensureOpsPushSubscription(vapidPublicKey);
      setStatus('on');
      toast.success(t('ops.settings.pushEnabled'));
    } catch (error) {
      toast.error(toUserErrorMessage(error, t('ops.settings.pushFailed')));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const sub = await currentSubscription();
      if (sub) {
        await fetch('/api/ops/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('off');
      toast.success(t('ops.settings.pushDisabled'));
    } catch (error) {
      toast.error(toUserErrorMessage(error, t('ops.settings.pushFailed')));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <h2 className="mb-1 font-semibold">{t('ops.settings.pushTitle')}</h2>
      <p className="mb-4 text-sm text-zinc-600">{t('ops.settings.pushHint')}</p>
      {status === 'missing' ? (
        <p className="text-sm text-zinc-500">{t('ops.settings.pushUnsupported')}</p>
      ) : status === 'denied' ? (
        <p className="text-sm text-zinc-500">{t('ops.settings.pushDenied')}</p>
      ) : status === 'on' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void disable()}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-60"
        >
          {t('ops.settings.pushDisable')}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy || !vapidPublicKey}
          onClick={() => void enable()}
          className="rounded-lg bg-codiva-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {t('ops.settings.pushEnable')}
        </button>
      )}
    </section>
  );
}
