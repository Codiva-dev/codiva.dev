'use client';

import SurfaceI18n from '@/i18n/SurfaceI18n';
import type { Locale } from '@/i18n/config';
import type { ReactNode } from 'react';

const loaders = {
  es: () => import('@/i18n/locales/es/ticket.json'),
  en: () => import('@/i18n/locales/en/ticket.json'),
};

export default function TicketI18n({
  locale,
  bundle,
  children,
}: {
  locale: Locale;
  bundle: object;
  children: ReactNode;
}) {
  return (
    <SurfaceI18n id="ticket" locale={locale} bundle={bundle} loaders={loaders}>
      {children}
    </SurfaceI18n>
  );
}
