import { afterEach, describe, expect, it } from 'vitest';
import {
  buildGoogleCalendarEventBody,
  isGoogleCalendarConfigured,
  signGoogleOAuthState,
  verifyGoogleOAuthState,
} from './google-calendar';

describe('google calendar helpers', () => {
  const prevId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const prevSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

  afterEach(() => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = prevId;
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = prevSecret;
  });

  it('detects configuration', () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = '';
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = '';
    expect(isGoogleCalendarConfigured()).toBe(false);
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'cid';
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'secret';
    expect(isGoogleCalendarConfigured()).toBe(true);
  });

  it('signs and verifies oauth state', () => {
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'test-secret';
    const staffId = '11111111-1111-1111-1111-111111111111';
    const now = 1_700_000_000_000;
    const state = signGoogleOAuthState(staffId, now);
    expect(verifyGoogleOAuthState(state, now + 1000)).toEqual({ ok: true, staffId });
    expect(verifyGoogleOAuthState(state, now + 20 * 60 * 1000).ok).toBe(false);
    expect(verifyGoogleOAuthState(`${state}x`, now + 1000).ok).toBe(false);
  });

  it('builds google event body with duration', () => {
    const body = buildGoogleCalendarEventBody({
      title: 'Kickoff',
      startsAt: '2026-10-30T16:00:00.000Z',
      durationMinutes: 45,
      location: 'Meet',
      meetingUrl: 'https://meet.google.com/abc',
      description: 'Ops',
    });
    expect(body.summary).toBe('Kickoff');
    expect(body.start.dateTime).toBe('2026-10-30T16:00:00.000Z');
    expect(body.end.dateTime).toBe('2026-10-30T16:45:00.000Z');
    expect(body.location).toBe('Meet');
    expect(body.description).toContain('Ops');
    expect(body.description).toContain('https://meet.google.com/abc');
  });
});
