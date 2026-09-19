import type { Metadata } from 'next';
import OpsToaster from '@/components/ops/OpsToaster';
import OpsAnalytics from '@/components/ops/OpsAnalytics';
import OpsI18n from '@/i18n/OpsI18n';
import { loadOpsSurface } from '@/i18n/load-ops-surface';
import { getT } from '@/i18n/locale';
import enOpsAuth from '@/i18n/locales/en/ops-auth.json';
import esOpsAuth from '@/i18n/locales/es/ops-auth.json';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: 'Codiva.dev',
    description: t('ops.metaDescription'),
    robots: { index: false, follow: false },
  };
}

export default async function OpsRootLayout({ children }: { children: React.ReactNode }) {
  const surface = await loadOpsSurface(esOpsAuth, enOpsAuth);
  return (
    <OpsI18n {...surface}>
      <div className="min-h-screen bg-codiva-background font-sans text-zinc-900 antialiased">
        {children}
        <OpsToaster />
        <OpsAnalytics />
      </div>
    </OpsI18n>
  );
}
