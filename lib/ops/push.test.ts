import { describe, expect, it } from 'vitest';
import { isGonePushError, isPushConfigured } from './push';

describe('web push helpers', () => {
  it('treats 404 and 410 as gone subscriptions', () => {
    expect(isGonePushError({ statusCode: 410 })).toBe(true);
    expect(isGonePushError({ statusCode: 404 })).toBe(true);
    expect(isGonePushError({ statusCode: 500 })).toBe(false);
    expect(isGonePushError(new Error('fail'))).toBe(false);
  });

  it('is off when VAPID env is missing', () => {
    expect(isPushConfigured()).toBe(Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY));
  });
});
