import OpsStaffI18n from '@/i18n/OpsStaffI18n';
import { loadOpsSurface } from '@/i18n/load-ops-surface';
import en from '@/i18n/locales/en/ops-staff.json';
import es from '@/i18n/locales/es/ops-staff.json';

export default async function OpsStaffI18nGate({ children }: { children: React.ReactNode }) {
  const surface = await loadOpsSurface(es, en);
  return <OpsStaffI18n {...surface}>{children}</OpsStaffI18n>;
}
