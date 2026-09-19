export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'es';
export const LOCALE_COOKIE = 'codiva_lng';
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return value === 'es' || value === 'en';
}

export function resolveLocale(value: unknown): Locale {
  if (typeof value === 'string') {
    const short = value.split('-')[0];
    if (isLocale(short)) return short;
  }
  return DEFAULT_LOCALE;
}

export function pickLocaleMessages<T>(locale: Locale, es: T, en: T): T {
  return locale === 'en' ? en : es;
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const parts = header.split(',').map((part) => {
    const [tag, q] = part.trim().split(';q=');
    return { tag: (tag || '').toLowerCase(), q: q ? Number(q) : 1 };
  });
  parts.sort((a, b) => b.q - a.q);
  for (const { tag } of parts) {
    if (tag.startsWith('es')) return 'es';
    if (tag.startsWith('en')) return 'en';
  }
  return DEFAULT_LOCALE;
}

export function dateLocale(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'es-MX';
}
