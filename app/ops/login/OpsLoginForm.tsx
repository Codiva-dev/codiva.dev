'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AuthPasswordForm from '@/components/ops/AuthPasswordForm';

export default function OpsLoginForm() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const urlMessage =
    urlError === 'not_staff'
      ? t('ops.login.notStaff')
      : urlError === 'auth'
        ? t('ops.login.authExpired')
        : '';

  return (
    <AuthPasswordForm
      title={t('ops.login.title')}
      subtitle={t('ops.login.subtitle')}
      emailLabel={t('portal.login.email')}
      passwordLabel={t('portal.login.password')}
      forgotLabel={t('portal.login.forgot')}
      forgotHref="/forgot-password"
      submitLabel={t('ops.login.submit')}
      submittingLabel={t('ops.login.submitting')}
      failedLabel={t('portal.login.failed')}
      welcomeLabel={t('ops.login.welcome')}
      emailId="ops-login-email"
      passwordId="ops-login-password"
      urlMessage={urlMessage}
      defaultNext="/dashboard"
      authorize={async ({ supabase, user }) => {
        const { data: staff, error: staffError } = await supabase
          .from('staff_profiles')
          .select('id')
          .eq('id', user.id)
          .eq('active', true)
          .maybeSingle();

        if (staffError || !staff) return { ok: false, message: t('ops.login.notStaffLong') };
        return { ok: true };
      }}
    />
  );
}
