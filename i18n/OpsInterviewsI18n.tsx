'use client';

import SurfaceI18n from '@/i18n/SurfaceI18n';
import en from '@/i18n/locales/en/ops-interviews.json';
import es from '@/i18n/locales/es/ops-interviews.json';

export default function OpsInterviewsI18n({ children }: { children: React.ReactNode }) {
  return (
    <SurfaceI18n id="ops-interviews" es={es} en={en}>
      {children}
    </SurfaceI18n>
  );
}
