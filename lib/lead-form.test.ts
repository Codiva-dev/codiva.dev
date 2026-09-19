import { describe, expect, it } from 'vitest';
import { EMAIL_WITH_TLD, phoneDigits } from './lead-form';

describe('lead-form helpers', () => {
  it('accepts emails with a TLD', () => {
    expect(EMAIL_WITH_TLD.test('a@b.co')).toBe(true);
    expect(EMAIL_WITH_TLD.test('a@b')).toBe(false);
    expect(EMAIL_WITH_TLD.test('not-an-email')).toBe(false);
  });

  it('keeps phone digits only', () => {
    expect(phoneDigits('+52 55 1234-5678')).toBe('525512345678');
    expect(phoneDigits('')).toBe('');
  });
});
