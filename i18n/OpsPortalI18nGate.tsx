import OpsPortalI18n from '@/i18n/OpsPortalI18n';
import { loadOpsSurface } from '@/i18n/load-ops-surface';
import en from '@/i18n/locales/en/ops-portal.json';
import es from '@/i18n/locales/es/ops-portal.json';

export default async function OpsPortalI18nGate({ children }: { children: React.ReactNode }) {
  const surface = await loadOpsSurface(es, en);
  return <OpsPortalI18n {...surface}>{children}</OpsPortalI18n>;
}
