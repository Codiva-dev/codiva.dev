import OpsPortalI18n from '@/i18n/OpsPortalI18n';
import OpsStaffI18n from '@/i18n/OpsStaffI18n';

export default function OpsLoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <OpsStaffI18n>
      <OpsPortalI18n>{children}</OpsPortalI18n>
    </OpsStaffI18n>
  );
}
