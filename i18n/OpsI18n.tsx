'use client';

import SurfaceI18n from '@/i18n/SurfaceI18n';
import en from '@/i18n/locales/en/ops-auth.json';
import es from '@/i18n/locales/es/ops-auth.json';

export default function OpsI18n({ children }: { children: React.ReactNode }) {
  return (
    <SurfaceI18n id="ops-auth" es={es} en={en}>
      {children}
    </SurfaceI18n>
  );
}
