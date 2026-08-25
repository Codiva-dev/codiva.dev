import { afterEach, describe, expect, it } from 'vitest';
import {
  authCallbackFailureUrl,
  authCallbackFallbackPath,
  authCallbackSuccessUrl,
  portalHubAuthCallbackUrl,
  withRecoveryOtpParams,
} from './auth-urls';

const ENV_KEYS = [
  'NEXT_PUBLIC_OPS_URL',
  'NEXT_PUBLIC_PORTAL_URL',
  'NEXT_PUBLIC_INTERVIEWS_URL',
  'OPS_HOST',
  'PORTAL_HOST',
  'INTERVIEWS_HOST',
] as const;

const envSnapshot = new Map<string, string | undefined>();
for (const key of ENV_KEYS) envSnapshot.set(key, process.env[key]);

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = envSnapshot.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(restoreEnv);

describe('withRecoveryOtpParams', () => {
  it('adds token_hash and type=recovery without dropping next', () => {
    const callback = portalHubAuthCallbackUrl('/reset-password');
    const url = new URL(withRecoveryOtpParams(callback, 'abc123'));
    expect(url.searchParams.get('next')).toBe('/reset-password');
    expect(url.searchParams.get('token_hash')).toBe('abc123');
    expect(url.searchParams.get('type')).toBe('recovery');
  });
});

describe('auth callback redirects', () => {
  it('sends portal recovery failures to the hub login', () => {
    expect(authCallbackFailureUrl('portal.codiva.dev', '/reset-password')).toBe(
      'https://portal.codiva.dev/login?error=auth'
    );
  });

  it('sends project recovery failures to the project login', () => {
    expect(authCallbackFailureUrl('portal.codiva.dev', '/p/deskpace/reset-password')).toBe(
      'https://portal.codiva.dev/p/deskpace/login?error=auth'
    );
  });

  it('keeps success on the same surface', () => {
    expect(authCallbackFallbackPath('portal.codiva.dev')).toBe('/proyectos');
    expect(authCallbackSuccessUrl('portal.codiva.dev', '/reset-password')).toBe(
      'https://portal.codiva.dev/reset-password'
    );
  });
});
