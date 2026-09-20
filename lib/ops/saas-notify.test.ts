import { describe, expect, it } from 'vitest';
import { saasLicenseAlert, saasVendorAlert } from './saas-notify';

describe('saas staff mail', () => {
  it('formats a grace alert with a license CTA', () => {
    const alert = saasLicenseAlert({
      status: 'grace',
      instanceKey: 'nirc',
      reason: 'La instancia nirc se marcó en periodo de gracia.',
      projectName: 'NIRC MVP Fase 1',
      projectSlug: 'nirc',
    });
    expect(alert.subject).toBe('Licencia NIRC en periodo de gracia');
    expect(alert.html).toContain('Instancia: nirc');
    expect(alert.html).toContain('pendiente');
    expect(alert.html).toContain('Abrir licencia');
    expect(alert.html).toContain('tab=licencia');
  });

  it('formats a vendor expiry alert', () => {
    const alert = saasVendorAlert({
      instanceKey: 'nirc',
      slot: 'cincel',
      expiresAt: '2026-09-24T00:00:00.000Z',
      projectSlug: 'nirc',
    });
    expect(alert.subject).toBe('Vendor NIRC por vencer · cincel');
    expect(alert.html).toContain('cincel');
    expect(alert.html).toContain('Abrir licencia');
  });
});
