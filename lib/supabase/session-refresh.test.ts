import { afterEach, describe, expect, it } from 'vitest';
import { isSupabaseAnonConfigured, needsAuthSessionRefresh } from './session-refresh';

const ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;
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

describe('needsAuthSessionRefresh', () => {
  it('skips public marketing, career, and ticket pages', () => {
    expect(needsAuthSessionRefresh('www.codiva.dev', '/')).toBe(false);
    expect(needsAuthSessionRefresh('localhost:3000', '/')).toBe(false);
    expect(needsAuthSessionRefresh('localhost:3000', '/cotiza')).toBe(false);
    expect(needsAuthSessionRefresh('localhost:3000', '/empleos')).toBe(false);
    expect(needsAuthSessionRefresh('career.codiva.dev', '/')).toBe(false);
    expect(needsAuthSessionRefresh('ticket.codiva.dev', '/')).toBe(false);
    expect(needsAuthSessionRefresh('www.codiva.dev', '/legal/terminos')).toBe(false);
  });

  it('refreshes ops, portal, interviews, and APIs', () => {
    expect(needsAuthSessionRefresh('ops.codiva.dev', '/dashboard')).toBe(true);
    expect(needsAuthSessionRefresh('ops.localhost:3000', '/projects/abc')).toBe(true);
    expect(needsAuthSessionRefresh('portal.codiva.dev', '/p/nirc')).toBe(true);
    expect(needsAuthSessionRefresh('interviews.codiva.dev', '/')).toBe(true);
    expect(needsAuthSessionRefresh('www.codiva.dev', '/api/leads')).toBe(true);
    expect(needsAuthSessionRefresh('localhost:3000', '/login')).toBe(true);
    expect(needsAuthSessionRefresh('localhost:3000', '/ops/dashboard')).toBe(true);
  });
});

describe('isSupabaseAnonConfigured', () => {
  it('is false when url or anon key is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(isSupabaseAnonConfigured()).toBe(false);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    expect(isSupabaseAnonConfigured()).toBe(false);
  });

  it('is true when both public values exist', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon';
    expect(isSupabaseAnonConfigured()).toBe(true);
  });
});
