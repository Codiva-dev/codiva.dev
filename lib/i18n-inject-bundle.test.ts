import { describe, expect, it } from 'vitest';
import i18n from '@/i18n/i18n';
import { pickLocaleMessages } from '@/i18n/config';
import { injectLocaleBundle } from '@/i18n/injectBundle';

describe('injectLocaleBundle', () => {
  it('adds a single locale without writing the other', () => {
    injectLocaleBundle('surface-test', 'en', { surfaceTestKey: 'hello' });
    expect(i18n.getResource('en', 'translation', 'surfaceTestKey')).toBe('hello');
    expect(i18n.getResource('es', 'translation', 'surfaceTestKey')).toBeUndefined();
  });
});

describe('pickLocaleMessages', () => {
  it('returns the matching dictionary', () => {
    expect(pickLocaleMessages('en', { n: 'es' }, { n: 'en' })).toEqual({ n: 'en' });
    expect(pickLocaleMessages('es', { n: 'es' }, { n: 'en' })).toEqual({ n: 'es' });
  });
});
