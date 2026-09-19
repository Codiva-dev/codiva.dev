'use client';

import SurfaceI18n from '@/i18n/SurfaceI18n';
import en from '@/i18n/locales/en/ops-staff.json';
import es from '@/i18n/locales/es/ops-staff.json';

export default function OpsStaffI18n({ children }: { children: React.ReactNode }) {
  return (
    <SurfaceI18n id="ops-staff" es={es} en={en}>
      {children}
    </SurfaceI18n>
  );
}
