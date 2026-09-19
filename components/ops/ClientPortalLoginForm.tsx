'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AuthPasswordForm from '@/components/ops/AuthPasswordForm';

export default function ClientPortalLoginForm() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const urlMessage =
    error === 'no_access'
      ? t('portal.login.noAccess')
      : error === 'auth'
        ? t('portal.login.authExpired')
        : '';

  return (
    <AuthPasswordForm
      title={t('portal.login.title')}
      subtitle={t('portal.login.subtitle')}
      emailLabel={t('portal.login.email')}
      passwordLabel={t('portal.login.password')}
      forgotLabel={t('portal.login.forgot')}
      forgotHref="/login/forgot-password"
      submitLabel={t('portal.login.submit')}
      submittingLabel={t('portal.login.submitting')}
      failedLabel={t('portal.login.failed')}
      welcomeLabel={t('portal.login.welcome')}
      emailId="portal-login-email"
      passwordId="portal-login-password"
      urlMessage={urlMessage}
      defaultNext="/proyectos"
      authorize={async ({ supabase, user }) => {
        const { data: memberships } = await supabase
          .from('project_members')
          .select('id, projects!inner(id, client_visible)')
          .eq('user_id', user.id);

        const hasVisible = (memberships ?? []).some((row) => {
          const raw = row.projects as { client_visible?: boolean } | { client_visible?: boolean }[] | null;
          const p = Array.isArray(raw) ? raw[0] : raw;
          return p?.client_visible === true;
        });

        if (!hasVisible) return { ok: false, message: t('portal.login.noProject') };
        return { ok: true };
      }}
    />
  );
}
