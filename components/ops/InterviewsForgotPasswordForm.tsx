'use client';

import { useTranslation } from 'react-i18next';
import AuthForgotPasswordForm from '@/components/ops/AuthForgotPasswordForm';
import { requestInterviewPasswordReset } from '@/lib/ops/password-reset';

export default function InterviewsForgotPasswordForm() {
  const { t } = useTranslation();
  return (
    <AuthForgotPasswordForm
      title={t('interviews.forgot.title')}
      subtitle={t('interviews.forgot.subtitle')}
      emailLabel={t('interviews.login.email')}
      emailId="interviews-forgot-email"
      sendLabel={t('interviews.forgot.sendLink')}
      sendingLabel={t('interviews.forgot.sending')}
      backLabel={t('interviews.forgot.back')}
      backHref="/login"
      requestReset={requestInterviewPasswordReset}
    />
  );
}
