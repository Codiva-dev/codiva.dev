import i18n from '@/i18n/i18n';
import type { Locale } from '@/i18n/config';

const injected = new Set<string>();

function bundleKey(id: string, locale: Locale) {
  return `${id}:${locale}`;
}

export function injectLocaleBundle(id: string, locale: Locale, messages: object) {
  const key = bundleKey(id, locale);
  if (injected.has(key)) return;
  injected.add(key);
  i18n.addResourceBundle(locale, 'translation', messages, true, true);
}
