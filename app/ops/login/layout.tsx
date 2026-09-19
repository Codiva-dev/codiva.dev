import OpsPortalI18nGate from '@/i18n/OpsPortalI18nGate';
import OpsStaffI18nGate from '@/i18n/OpsStaffI18nGate';

export default function OpsLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <OpsStaffI18nGate>
      <OpsPortalI18nGate>{children}</OpsPortalI18nGate>
    </OpsStaffI18nGate>
  );
}
