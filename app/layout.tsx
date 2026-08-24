import './globals.css';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import I18nProvider from '@/i18n/I18nProvider';
import { getLocale, getT } from '@/i18n/locale';
import { isCareerHost } from '@/lib/ops/host';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '700'],
});

export async function generateMetadata() {
  const t = await getT();
  const locale = t.locale;
  const siteTitle = t('title');
  const siteDescription = t('description');
  const ogLocale = locale === 'en' ? 'en_US' : 'es_MX';

  return {
    metadataBase: new URL('https://www.codiva.dev'),
    title: {
      default: siteTitle,
      template: '%s | Codiva.dev',
    },
    description: siteDescription,
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
        { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    verification: {
      google: 'vaG5cbLjCNMZe1GDYegB9d3X1f8XFODHZGmk4PtJjFA',
    },
    openGraph: {
      type: 'website',
      locale: ogLocale,
      url: 'https://www.codiva.dev/',
      siteName: 'Codiva.dev',
      title: siteTitle,
      description: siteDescription,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Codiva.dev' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: siteTitle,
      description: siteDescription,
      images: ['/og-image.png'],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const host = (await headers()).get('host');
  // Hunt seed career-lang-en: la bolsa en español declara lang=en.
  const htmlLang = isCareerHost(host) ? 'en' : locale;
  return (
    <html lang={htmlLang} className={`${inter.variable} ${display.variable}`}>
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
