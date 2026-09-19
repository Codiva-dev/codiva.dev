import { describe, expect, it } from 'vitest';
import { opsGreetingPeriod, staffFirstName } from './home';

describe('staffFirstName', () => {
  it('keeps the first given name', () => {
    expect(staffFirstName('Jean Carlo')).toBe('Jean');
    expect(staffFirstName('  María Elena  ')).toBe('María');
    expect(staffFirstName('')).toBe('Staff');
  });
});

describe('opsGreetingPeriod', () => {
  it('uses America/Mexico_City hours', () => {
    expect(opsGreetingPeriod(new Date('2026-09-22T16:00:00.000Z'))).toBe('morning');
    expect(opsGreetingPeriod(new Date('2026-09-22T20:00:00.000Z'))).toBe('afternoon');
    expect(opsGreetingPeriod(new Date('2026-09-23T02:00:00.000Z'))).toBe('evening');
  });
});
