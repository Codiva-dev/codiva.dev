'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AuthPasswordForm from '@/components/ops/AuthPasswordForm';

export default function InterviewsLoginForm() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const urlMessage =
    error === 'no_access'
      ? t('interviews.login.noAccess')
      : error === 'auth'
        ? t('interviews.login.authExpired')
        : '';

  return (
    <AuthPasswordForm
      title={t('interviews.login.title')}
      subtitle={t('interviews.login.subtitle')}
      emailLabel={t('interviews.login.email')}
      passwordLabel={t('interviews.login.password')}
      forgotLabel={t('interviews.login.forgot')}
      forgotHref="/login/forgot-password"
      submitLabel={t('interviews.login.submit')}
      submittingLabel={t('interviews.login.submitting')}
      failedLabel={t('interviews.login.failed')}
      welcomeLabel={t('interviews.login.welcome')}
      emailId="interviews-login-email"
      passwordId="interviews-login-password"
      urlMessage={urlMessage}
      defaultNext="/"
      authorize={async ({ supabase, user }) => {
        const { data: membership } = await supabase
          .from('ops_recruiting_partner_members')
          .select('id, active, ops_recruiting_partners!inner(active)')
          .eq('user_id', user.id)
          .eq('active', true)
          .maybeSingle();

        const partner = membership?.ops_recruiting_partners as { active?: boolean } | { active?: boolean }[] | null;
        const org = Array.isArray(partner) ? partner[0] : partner;
        if (!membership?.id || org?.active === false) {
          return { ok: false, message: t('interviews.login.noAccess') };
        }
        return { ok: true };
      }}
    />
  );
}
