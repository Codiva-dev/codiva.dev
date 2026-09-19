import { describe, expect, it } from 'vitest';
import { isHuntToken } from './cookie';

describe('isHuntToken', () => {
  it('rejects empty or short values', () => {
    expect(isHuntToken('')).toBe(false);
    expect(isHuntToken('   ')).toBe(false);
    expect(isHuntToken('short-token')).toBe(false);
    expect(isHuntToken(null)).toBe(false);
    expect(isHuntToken(undefined)).toBe(false);
  });

  it('accepts tokens of at least 16 characters', () => {
    expect(isHuntToken('1234567890abcdef')).toBe(true);
    expect(isHuntToken('  1234567890abcdef  ')).toBe(true);
  });
});
