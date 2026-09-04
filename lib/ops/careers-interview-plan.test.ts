import { describe, expect, it } from 'vitest';
import { parseHireCompensation, parseHireCurrency, parseInterviewPlan } from './careers';

describe('parseInterviewPlan', () => {
  it('keeps valid kinds in order and drops duplicates', () => {
    expect(parseInterviewPlan(['technical', 'screening', 'technical', 'nope'])).toEqual([
      'technical',
      'screening',
    ]);
  });

  it('treats empty input as no seeded rounds', () => {
    expect(parseInterviewPlan([])).toEqual([]);
    expect(parseInterviewPlan(null)).toEqual([]);
    expect(parseInterviewPlan('')).toEqual([]);
  });
});

describe('parseHireCompensation', () => {
  it('reads a positive amount and ignores blanks', () => {
    expect(parseHireCompensation('1200.5')).toBe(1200.5);
    expect(parseHireCompensation('')).toBeNull();
    expect(parseHireCompensation('0')).toBeNull();
  });
});

describe('parseHireCurrency', () => {
  it('normalizes currency codes', () => {
    expect(parseHireCurrency('mxn')).toBe('MXN');
    expect(parseHireCurrency('')).toBe('USD');
  });
});
