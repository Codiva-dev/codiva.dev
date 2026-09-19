'use client';

import { injectTranslationBundle } from '@/i18n/injectBundle';

export default function SurfaceI18n({
  id,
  es,
  en,
  children,
}: {
  id: string;
  es: object;
  en: object;
  children: React.ReactNode;
}) {
  injectTranslationBundle(id, es, en);
  return children;
}
