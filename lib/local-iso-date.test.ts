import { describe, expect, it } from 'vitest';
import { isIsoDateOnOrAfterToday, localIsoDate } from './local-iso-date';

describe('localIsoDate', () => {
  it('formats a local calendar date', () => {
    expect(localIsoDate(new Date(2026, 7, 24))).toBe('2026-08-24');
  });
});

describe('isIsoDateOnOrAfterToday', () => {
  it('rejects yesterday and accepts today', () => {
    expect(isIsoDateOnOrAfterToday('2026-08-23', '2026-08-24')).toBe(false);
    expect(isIsoDateOnOrAfterToday('2026-08-24', '2026-08-24')).toBe(true);
    expect(isIsoDateOnOrAfterToday('2026-08-25', '2026-08-24')).toBe(true);
  });
});
