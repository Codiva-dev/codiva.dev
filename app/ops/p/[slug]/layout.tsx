import OpsPortalI18nGate from '@/i18n/OpsPortalI18nGate';

export default function ProjectPortalAuthLayout({ children }: { children: React.ReactNode }) {
  return <OpsPortalI18nGate>{children}</OpsPortalI18nGate>;
}
