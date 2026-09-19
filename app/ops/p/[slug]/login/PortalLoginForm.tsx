'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import AuthPasswordForm from '@/components/ops/AuthPasswordForm';

export default function PortalLoginForm({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const urlMessage =
    error === 'no_access'
      ? t('portal.login.noAccess')
      : error === 'not_found'
        ? t('portal.login.notFound')
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
      forgotHref={`/p/${slug}/login/forgot-password`}
      submitLabel={t('portal.login.submit')}
      submittingLabel={t('portal.login.submitting')}
      failedLabel={t('portal.login.failed')}
      welcomeLabel={t('portal.login.welcome')}
      emailId="slug-login-email"
      passwordId="slug-login-password"
      urlMessage={urlMessage}
      defaultNext={`/p/${slug}`}
      authorize={async ({ supabase, user }) => {
        const { data: staff } = await supabase
          .from('staff_profiles')
          .select('id')
          .eq('id', user.id)
          .eq('active', true)
          .maybeSingle();

        if (staff) return { ok: true };

        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('slug', slug)
          .eq('client_visible', true)
          .maybeSingle();

        if (!project) return { ok: false, message: t('portal.login.projectUnavailable') };

        const { data: member } = await supabase
          .from('project_members')
          .select('id')
          .eq('project_id', project.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!member) return { ok: false, message: t('portal.login.noAccess') };
        return { ok: true };
      }}
    />
  );
}
