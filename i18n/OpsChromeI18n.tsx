'use client';

import SurfaceI18n from '@/i18n/SurfaceI18n';
import en from '@/i18n/locales/en/ops-chrome.json';
import es from '@/i18n/locales/es/ops-chrome.json';

export default function OpsChromeI18n({ children }: { children: React.ReactNode }) {
  return (
    <SurfaceI18n id="ops-chrome" es={es} en={en}>
      {children}
    </SurfaceI18n>
  );
}
