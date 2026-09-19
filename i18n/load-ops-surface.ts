import { pickLocaleMessages } from '@/i18n/config';
import { getLocale } from '@/i18n/locale';

export async function loadOpsSurface(es: object, en: object) {
  const locale = await getLocale();
  return { locale, bundle: pickLocaleMessages(locale, es, en) as object };
}
