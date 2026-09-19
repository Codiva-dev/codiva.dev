'use client';

import { useEffect, type ReactNode } from 'react';
import i18n from '@/i18n/i18n';
import { isLocale, type Locale } from '@/i18n/config';
import { injectLocaleBundle } from '@/i18n/injectBundle';

type LocaleLoader = () => Promise<{ default?: object } & object>;

export default function SurfaceI18n({
  id,
  locale,
  bundle,
  loaders,
  children,
}: {
  id: string;
  locale: Locale;
  bundle: object;
  loaders: Record<Locale, LocaleLoader>;
  children: ReactNode;
}) {
  injectLocaleBundle(id, locale, bundle);

  useEffect(() => {
    const onLang = (lng: string) => {
      if (!isLocale(lng) || lng === locale) return;
      void loaders[lng]().then((mod) => {
        injectLocaleBundle(id, lng, (mod.default ?? mod) as object);
      });
    };
    i18n.on('languageChanged', onLang);
    return () => {
      i18n.off('languageChanged', onLang);
    };
  }, [id, locale, loaders]);

  return children;
}
