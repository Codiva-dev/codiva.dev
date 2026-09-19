'use client';

import SurfaceI18n from '@/i18n/SurfaceI18n';
import type { Locale } from '@/i18n/config';
import type { ReactNode } from 'react';

const loaders = {
  es: () => import('@/i18n/locales/es/ops.json'),
  en: () => import('@/i18n/locales/en/ops.json'),
};

export default function OpsI18n({
  locale,
  bundle,
  children,
}: {
  locale: Locale;
  bundle: object;
  children: ReactNode;
}) {
  return (
    <SurfaceI18n id="ops" locale={locale} bundle={bundle} loaders={loaders}>
      {children}
    </SurfaceI18n>
  );
}
