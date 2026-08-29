'use client';

import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { scrollToSection } from '../utils/scrollToSection';
import HuntBeacon from '../components/careers/HuntBeacon';
import Navbar from '../components/Navbar';
import CodivaToaster from '@/components/ui/CodivaToaster';

const Footer = dynamic(() => import('../components/Footer'));
const FloatingQuoteButton = dynamic(() => import('../components/FloatingQuoteButton'), {
  ssr: false,
});

const Analytics = dynamic(
  () => import('@vercel/analytics/react').then((mod) => mod.Analytics),
  { ssr: false }
);

export default function LayoutClient({ children, variant = 'marketing' }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const isCareer = variant === 'career';
  const isTicket = variant === 'ticket';
  const isSatellite = isCareer || isTicket;

  useEffect(() => {
    if (isSatellite || pathname !== '/') return;

    const scrollFromHash = () => {
      const id = window.location.hash.replace('#', '');
      if (!id) return;
      requestAnimationFrame(() => scrollToSection(id));
    };

    scrollFromHash();
    window.addEventListener('hashchange', scrollFromHash);
    return () => window.removeEventListener('hashchange', scrollFromHash);
  }, [pathname, isSatellite]);

  // ✅ Microdatos para SEO (Organization)
  const schemaOrgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Codiva.dev",
    "url": "https://www.codiva.dev",
    "logo": "https://www.codiva.dev/logo.svg",
    "sameAs": ["https://www.linkedin.com/company/codiva"],
    "description": t('description')
  };

  const showQuote = !isSatellite;

  return (
    <div className="flex min-h-dvh min-w-0 flex-col overflow-x-clip bg-codiva-background font-sans text-zinc-900 antialiased">
      {/* Microdatos JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(schemaOrgJsonLd)}
      </script>

      <Navbar variant={variant} />
      {isCareer ? (
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-codiva-primary"
        >
          {t('career.skip_to_content')}
        </a>
      ) : null}
      <div className="flex-1">{children}</div>
      <div data-site-footer="" className="mt-auto">
        <Footer variant={variant} />
      </div>

      {showQuote && <FloatingQuoteButton />}

      <CodivaToaster />

      {isTicket ? null : <HuntBeacon />}

      <Analytics />
    </div>
  );
}