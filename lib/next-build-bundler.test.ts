import { describe, expect, it } from 'vitest';
import { shouldUseTurbopackBuild } from './next-build-bundler';

describe('shouldUseTurbopackBuild', () => {
  it('keeps webpack unless TURBOPACK=1', () => {
    expect(shouldUseTurbopackBuild({})).toBe(false);
    expect(shouldUseTurbopackBuild({ VERCEL_ENV: 'preview' })).toBe(false);
    expect(shouldUseTurbopackBuild({ VERCEL_ENV: 'production' })).toBe(false);
    expect(shouldUseTurbopackBuild({ TURBOPACK: '0' })).toBe(false);
  });

  it('switches to next build --turbopack when TURBOPACK=1', () => {
    expect(shouldUseTurbopackBuild({ TURBOPACK: '1' })).toBe(true);
    expect(shouldUseTurbopackBuild({ VERCEL_ENV: 'preview', TURBOPACK: '1' })).toBe(true);
  });
});
