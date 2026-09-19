'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import CodivaWordmarkMark from '@/components/CodivaWordmarkMark';
import StatusScreen from '@/components/ops/StatusScreen';
import Button from '@/components/ui/Button';
import { reportError } from '@/lib/report-error';

export default function OpsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <StatusScreen
      eyebrow={<CodivaWordmarkMark size="sm" />}
      code="500"
      title={t('errors.serverTitle')}
      description={t('errors.opsServerBody')}
      actions={
        <>
          <Button type="button" size="sm" onClick={reset}>
            {t('errors.retry')}
          </Button>
          <Button as={Link} href="/pendientes" variant="secondary" size="sm">
            {t('errors.opsHome')}
          </Button>
          <Button as={Link} href="/login" variant="ghost" size="sm">
            Login
          </Button>
        </>
      }
    />
  );
}
