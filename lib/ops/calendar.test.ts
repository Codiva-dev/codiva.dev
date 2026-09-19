import { describe, expect, it } from 'vitest';
import {
  addDaysYmd,
  buildCalendarIcs,
  clampCalendarDuration,
  mondayOfWeek,
  reminderDue,
  scheduleChanged,
  utcIsoToZonedLocal,
  weekDays,
  ymdInTimeZone,
  zonedLocalToUtcIso,
} from './calendar';

describe('Mexico City wall time', () => {
  it('converts 10:00 CDMX to 16:00 UTC', () => {
    expect(zonedLocalToUtcIso('2026-09-22T10:00')).toBe('2026-09-22T16:00:00.000Z');
  });

  it('round-trips ISO to datetime-local', () => {
    expect(utcIsoToZonedLocal('2026-09-22T16:00:00.000Z')).toBe('2026-09-22T10:00');
  });

  it('rejects invalid local input', () => {
    expect(zonedLocalToUtcIso('22/09/2026 10:00')).toBeNull();
    expect(zonedLocalToUtcIso('2026-09-22T25:00')).toBeNull();
  });
});

describe('week helpers', () => {
  it('finds Monday of a Wednesday', () => {
    expect(mondayOfWeek('2026-09-23')).toBe('2026-09-21');
  });

  it('keeps a Monday', () => {
    expect(mondayOfWeek('2026-09-21')).toBe('2026-09-21');
  });

  it('builds seven days', () => {
    expect(weekDays('2026-09-21')).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
  });

  it('adds days across months', () => {
    expect(addDaysYmd('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('maps an instant to a CDMX day', () => {
    expect(ymdInTimeZone('2026-09-22T16:00:00.000Z')).toBe('2026-09-22');
  });
});

describe('reminders', () => {
  const scheduledAt = '2026-09-22T16:00:00.000Z';

  it('is silent more than 24h before', () => {
    expect(
      reminderDue({
        scheduledAt,
        sent24h: null,
        sent1h: null,
        now: new Date('2026-09-20T16:00:00.000Z'),
      })
    ).toBeNull();
  });

  it('fires 24h inside the window', () => {
    expect(
      reminderDue({
        scheduledAt,
        sent24h: null,
        sent1h: null,
        now: new Date('2026-09-21T18:00:00.000Z'),
      })
    ).toBe('24h');
  });

  it('fires 1h when close, even if 24h was skipped', () => {
    expect(
      reminderDue({
        scheduledAt,
        sent24h: null,
        sent1h: null,
        now: new Date('2026-09-22T15:20:00.000Z'),
      })
    ).toBe('1h');
  });

  it('does not fire after start', () => {
    expect(
      reminderDue({
        scheduledAt,
        sent24h: null,
        sent1h: null,
        now: new Date('2026-09-22T16:01:00.000Z'),
      })
    ).toBeNull();
  });
});

describe('ics and duration', () => {
  it('clamps duration', () => {
    expect(clampCalendarDuration(5)).toBe(15);
    expect(clampCalendarDuration(999)).toBe(480);
    expect(clampCalendarDuration('60')).toBe(60);
  });

  it('emits a VEVENT with UTC stamps', () => {
    const ics = buildCalendarIcs({
      uid: 'interview-abc@ops.codiva.dev',
      title: 'Filtro · Ana',
      description: 'Entrevista Codiva',
      startsAt: '2026-09-22T16:00:00.000Z',
      durationMinutes: 60,
      location: 'Meet',
      url: 'https://ops.codiva.dev/entrevistas/abc',
      stamp: new Date('2026-09-19T12:00:00.000Z'),
    });
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20260922T160000Z');
    expect(ics).toContain('DTEND:20260922T170000Z');
    expect(ics).toContain('SUMMARY:Filtro · Ana');
  });

  it('detects schedule changes', () => {
    expect(scheduleChanged(null, '2026-09-22T16:00:00.000Z')).toBe(true);
    expect(scheduleChanged('2026-09-22T16:00:00.000Z', '2026-09-22T16:00:00.000Z')).toBe(false);
  });
});
