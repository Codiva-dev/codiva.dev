'use client';

import { useTranslation } from 'react-i18next';
import AuthForgotPasswordForm from '@/components/ops/AuthForgotPasswordForm';
import { requestPortalPasswordReset } from '@/lib/ops/password-reset';

export default function PortalForgotPasswordForm({ slug }: { slug: string }) {
  const { t } = useTranslation();
  return (
    <AuthForgotPasswordForm
      title={t('portal.forgot.title')}
      subtitle={t('portal.forgot.subtitlePortal')}
      emailLabel={t('portal.login.email')}
      emailId="slug-forgot-email"
      sendLabel={t('portal.forgot.sendLink')}
      sendingLabel={t('portal.forgot.sending')}
      backLabel={t('portal.forgot.back')}
      backHref={`/p/${slug}/login`}
      requestReset={(email) => requestPortalPasswordReset(email, slug)}
    />
  );
}
