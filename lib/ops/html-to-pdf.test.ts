import { describe, expect, it } from 'vitest';
import { isChromiumBusyError } from './html-to-pdf';

describe('isChromiumBusyError', () => {
  it('matches ETXTBSY from spawn', () => {
    const err = Object.assign(new Error('spawn ETXTBSY'), { code: 'ETXTBSY' });
    expect(isChromiumBusyError(err)).toBe(true);
  });

  it('ignores unrelated errors', () => {
    expect(isChromiumBusyError(new Error('net::ERR_FAILED'))).toBe(false);
    expect(isChromiumBusyError(null)).toBe(false);
  });
});
