import { describe, expect, it } from 'vitest';
import { instanceApiOrigin } from './saas-instance-http';
import {
  deriveSaasStatusFromCharges,
  periodLabelFromIso,
  signInstanceLicense,
  vendorSlotIsDue,
  verifyInstanceLicense,
} from './saas-license';

describe('saas license', () => {
  it('roundtrips an entitlement JWT', async () => {
    const secret = 'ops-license-secret-for-tests-32b';
    const token = await signInstanceLicense(
      {
        sub: 'nirc',
        status: 'grace',
        modules: ['cincel', 'idse'],
        periodStart: '2026-09-01T00:00:00.000Z',
        periodEnd: '2026-09-30T00:00:00.000Z',
        graceUntil: '2026-10-07T00:00:00.000Z',
      },
      secret
    );
    const claims = await verifyInstanceLicense(token, secret);
    expect(claims?.sub).toBe('nirc');
    expect(claims?.status).toBe('grace');
    expect(await verifyInstanceLicense(token, 'nope')).toBeNull();
  });

  it('worsens status from unpaid monthly charges', () => {
    expect(deriveSaasStatusFromCharges([])).toBe('active');
    expect(
      deriveSaasStatusFromCharges(
        [{ kind: 'saas_monthly', status: 'pending', due_date: '2026-09-01', notice_days: 7 }],
        new Date('2026-09-03T12:00:00.000Z')
      )
    ).toBe('grace');
    expect(
      deriveSaasStatusFromCharges(
        [{ kind: 'saas_monthly', status: 'overdue', due_date: '2026-09-01', notice_days: 7 }],
        new Date('2026-09-10T12:00:00.000Z')
      )
    ).toBe('locked');
  });

  it('flags vendor JWT inside the 7-day window', () => {
    const now = Date.parse('2026-09-19T00:00:00.000Z');
    expect(vendorSlotIsDue('2026-09-24T00:00:00.000Z', now)).toBe(true);
    expect(vendorSlotIsDue('2026-10-20T00:00:00.000Z', now)).toBe(false);
    expect(periodLabelFromIso('2026-09-19T15:00:00.000Z')).toBe('2026-09');
  });

  it('derives the instance origin from the license push URL', () => {
    expect(instanceApiOrigin('https://app.nircgroup.info/api/internal/codiva-license')).toBe(
      'https://app.nircgroup.info'
    );
    expect(instanceApiOrigin('')).toBeNull();
    expect(instanceApiOrigin('not-a-url')).toBeNull();
  });
});
