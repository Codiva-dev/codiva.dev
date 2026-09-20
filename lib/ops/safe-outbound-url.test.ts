import { afterEach, describe, expect, it } from 'vitest';
import { assertSafeOutboundUrl, optionalSafeOutboundUrl, safeOutboundOrigin } from './safe-outbound-url';

describe('assertSafeOutboundUrl', () => {
  afterEach(() => {
    delete process.env.CODIVA_SAAS_PUSH_HOST_ALLOWLIST;
  });

  it('accepts public https URLs', () => {
    expect(assertSafeOutboundUrl('https://app.nircgroup.info/api/internal/codiva-license')).toBe(
      'https://app.nircgroup.info/api/internal/codiva-license'
    );
  });

  it('rejects http, loopback, metadata and credentials', () => {
    expect(() => assertSafeOutboundUrl('http://example.com/x')).toThrow(/https/i);
    expect(() => assertSafeOutboundUrl('https://127.0.0.1/x')).toThrow(/privada/i);
    expect(() => assertSafeOutboundUrl('https://169.254.169.254/latest')).toThrow(/privada/i);
    expect(() => assertSafeOutboundUrl('https://localhost/x')).toThrow(/privada/i);
    expect(() => assertSafeOutboundUrl('https://10.0.0.4/x')).toThrow(/privada/i);
    expect(() => assertSafeOutboundUrl('https://user:pass@example.com/x')).toThrow(/credenciales/i);
  });

  it('honors host allowlist when set', () => {
    process.env.CODIVA_SAAS_PUSH_HOST_ALLOWLIST = 'nircgroup.info,.codiva.dev';
    expect(assertSafeOutboundUrl('https://app.nircgroup.info/push')).toContain('nircgroup.info');
    expect(assertSafeOutboundUrl('https://nirc.codiva.dev/push')).toContain('codiva.dev');
    expect(() => assertSafeOutboundUrl('https://evil.example/x')).toThrow(/permitido/i);
  });

  it('optional empty is null', () => {
    expect(optionalSafeOutboundUrl('')).toBeNull();
    expect(optionalSafeOutboundUrl('   ')).toBeNull();
    expect(safeOutboundOrigin('https://app.nircgroup.info/api')).toBe('https://app.nircgroup.info');
    expect(safeOutboundOrigin('https://127.0.0.1/x')).toBeNull();
  });
});
