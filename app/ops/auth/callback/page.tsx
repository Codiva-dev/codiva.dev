import { Suspense } from 'react';
import AuthCallbackClient from './AuthCallbackClient';
import { getT } from '@/i18n/locale';

export const dynamic = 'force-dynamic';

export default async function AuthCallbackPage() {
  const t = await getT();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-zinc-500">
          {t('portal.login.loading')}
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
