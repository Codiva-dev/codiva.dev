'use client';

import { useTranslation } from 'react-i18next';
import AuthForgotPasswordForm from '@/components/ops/AuthForgotPasswordForm';
import { requestStaffPasswordReset } from '@/lib/ops/password-reset';

export default function ForgotPasswordForm() {
  const { t } = useTranslation();
  return (
    <AuthForgotPasswordForm
      title={t('portal.forgot.title')}
      subtitle={t('portal.forgot.subtitle')}
      emailLabel={t('portal.login.email')}
      emailId="forgot-email"
      sendLabel={t('portal.forgot.sendLink')}
      sendingLabel={t('portal.forgot.sending')}
      backLabel={t('portal.forgot.back')}
      backHref="/login"
      requestReset={requestStaffPasswordReset}
    />
  );
}
