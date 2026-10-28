import { describe, expect, it } from 'vitest';
import { isExternalHandoffEligibleStatus } from './interview-seed';

describe('isExternalHandoffEligibleStatus', () => {
  it('allows open recruiting statuses', () => {
    expect(isExternalHandoffEligibleStatus('new')).toBe(true);
    expect(isExternalHandoffEligibleStatus('reviewed')).toBe(true);
    expect(isExternalHandoffEligibleStatus('interview')).toBe(true);
  });

  it('blocks closed statuses', () => {
    expect(isExternalHandoffEligibleStatus('hired')).toBe(false);
    expect(isExternalHandoffEligibleStatus('rejected')).toBe(false);
  });
});
