export const OPS_HOME_PATH = '/pendientes';

export type OpsGreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function staffFirstName(fullName: string | null | undefined, fallback = 'Staff') {
  const first = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0];
  return first || fallback;
}

export function opsGreetingPeriod(now = new Date(), timeZone = 'America/Mexico_City'): OpsGreetingPeriod {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now)
  );
  if (hour < 12) return 'morning';
  if (hour < 19) return 'afternoon';
  return 'evening';
}
