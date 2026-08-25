'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { createClient } from '@/lib/supabase/client';
import {
  authCallbackFailureUrl,
  authCallbackFallbackPath,
  authCallbackSuccessUrl,
} from '@/lib/ops/auth-urls';
import { safeInternalPath } from '@/lib/ops/safe-path';
import type { EmailOtpType } from '@supabase/supabase-js';

const OTP_TYPES = new Set<string>([
  'recovery',
  'magiclink',
  'signup',
  'invite',
  'email',
  'email_change',
]);

let callbackStarted = false;

export default function AuthCallbackClient() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (callbackStarted) return;
    callbackStarted = true;

    const host = window.location.host;
    const fallback = authCallbackFallbackPath(host);
    const next = safeInternalPath(searchParams.get('next'), fallback);
    const fail = () => {
      window.location.replace(authCallbackFailureUrl(host, next));
    };
    const succeed = () => {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      window.location.replace(authCallbackSuccessUrl(host, next));
    };

    const supabase = createClient();
    const tokenHash = searchParams.get('token_hash');
    const typeRaw = searchParams.get('type');
    const code = searchParams.get('code');

    void (async () => {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        succeed();
        return;
      }

      if (tokenHash && typeRaw && OTP_TYPES.has(typeRaw)) {
        const { error } = await supabase.auth.verifyOtp({
          type: typeRaw as EmailOtpType,
          token_hash: tokenHash,
        });
        if (!error) {
          succeed();
          return;
        }
        console.error('auth callback verifyOtp:', error.message);
        fail();
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          succeed();
          return;
        }
        console.error('auth callback exchangeCodeForSession:', error.message);
        fail();
        return;
      }

      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash;
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          succeed();
          return;
        }
        console.error('auth callback setSession:', error.message);
        fail();
        return;
      }

      fail();
    })();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
      {t('portal.login.loading')}
    </div>
  );
}
