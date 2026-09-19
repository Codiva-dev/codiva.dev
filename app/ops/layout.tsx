import type { Metadata } from 'next';
import OpsToaster from '@/components/ops/OpsToaster';
import OpsAnalytics from '@/components/ops/OpsAnalytics';
import OpsI18n from '@/i18n/OpsI18n';
import { pickLocaleMessages } from '@/i18n/config';
import { getLocale, getT } from '@/i18n/locale';
import enOps from '@/i18n/locales/en/ops.json';
import esOps from '@/i18n/locales/es/ops.json';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: 'Codiva.dev',
    description: t('ops.metaDescription'),
    robots: { index: false, follow: false },
  };
}

export default async function OpsRootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <OpsI18n locale={locale} bundle={pickLocaleMessages(locale, esOps, enOps)}>
      <div className="min-h-screen bg-codiva-background font-sans text-zinc-900 antialiased">
        {children}
        <OpsToaster />
        <OpsAnalytics />
      </div>
    </OpsI18n>
  );
}
