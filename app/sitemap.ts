import type { MetadataRoute } from 'next';
import { careerBaseUrl, marketingBaseUrl, ticketBaseUrl } from '@/lib/ops/host';

export default function sitemap(): MetadataRoute.Sitemap {
  const marketing = marketingBaseUrl();
  const career = careerBaseUrl();
  const ticket = ticketBaseUrl();
  const monthly = { changeFrequency: 'monthly' as const };

  return [
    { url: `${marketing}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${marketing}/cotiza`, lastModified: new Date(), ...monthly, priority: 0.8 },
    { url: `${marketing}/legal/terminos`, ...monthly, priority: 0.3 },
    { url: `${marketing}/legal/aviso-privacidad`, ...monthly, priority: 0.3 },
    { url: `${marketing}/legal/nda`, ...monthly, priority: 0.3 },
    { url: `${career}/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${career}/empleos/interna`, lastModified: new Date('2024-01-01'), ...monthly, priority: 0.1 },
    { url: `${career}/ingeniero-plataforma`, lastModified: new Date('2024-01-01'), ...monthly, priority: 0.1 },
    { url: `${ticket}/`, ...monthly, priority: 0.4 },
  ];
}
