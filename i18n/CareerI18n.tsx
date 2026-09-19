'use client';

import SurfaceI18n from '@/i18n/SurfaceI18n';
import type { Locale } from '@/i18n/config';
import type { ReactNode } from 'react';

const loaders = {
  es: () => import('@/i18n/locales/es/career.json'),
  en: () => import('@/i18n/locales/en/career.json'),
};

export default function CareerI18n({
  locale,
  bundle,
  children,
}: {
  locale: Locale;
  bundle: object;
  children: ReactNode;
}) {
  return (
    <SurfaceI18n id="career" locale={locale} bundle={bundle} loaders={loaders}>
      {children}
    </SurfaceI18n>
  );
}
