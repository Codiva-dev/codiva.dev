import { headers } from 'next/headers';
import StatusScreen from '@/components/ops/StatusScreen';
import CodivaWordmarkMark from '@/components/CodivaWordmarkMark';
import { isPortalHost, marketingBaseUrl } from '@/lib/ops/host';
import { getT } from '@/i18n/locale';

export default async function OpsNotFound() {
  const host = (await headers()).get('host');
  const onPortal = isPortalHost(host);
  const t = await getT();

  if (onPortal) {
    return (
      <StatusScreen
        eyebrow={<CodivaWordmarkMark size="sm" />}
        code="404"
        title={t('errors.notFoundTitle')}
        description={t('errors.portalNotFoundBody')}
        primaryHref={marketingBaseUrl()}
        primaryLabel={t('errors.goCodiva')}
      />
    );
  }

  return (
    <StatusScreen
      eyebrow={<CodivaWordmarkMark size="sm" />}
      code="404"
      title={t('errors.notFoundTitle')}
      description={t('errors.opsNotFoundBody')}
      primaryHref="/pendientes"
      primaryLabel={t('errors.opsHome')}
      secondaryHref="/login"
      secondaryLabel={t('errors.opsLogin')}
    />
  );
}
