'use client';

import SurfaceI18n from '@/i18n/SurfaceI18n';
import en from '@/i18n/locales/en/ops-portal.json';
import es from '@/i18n/locales/es/ops-portal.json';

export default function OpsPortalI18n({ children }: { children: React.ReactNode }) {
  return (
    <SurfaceI18n id="ops-portal" es={es} en={en}>
      {children}
    </SurfaceI18n>
  );
}
