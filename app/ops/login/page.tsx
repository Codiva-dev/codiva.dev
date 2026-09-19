import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import OpsLoginForm from './OpsLoginForm';
import { getT } from '@/i18n/locale';
import { createClient } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/ops/safe-path';

export default async function OpsLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: staff } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('id', user.id)
      .eq('active', true)
      .maybeSingle();
    if (staff) {
      const params = await searchParams;
      redirect(safeNextPath(params.next, '/pendientes'));
    }
  }

  const t = await getT();
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">{t('portal.login.loading')}</div>}>
      <OpsLoginForm />
    </Suspense>
  );
}
