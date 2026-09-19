export const OPS_HOME_PATH = '/pendientes';
export const OPS_FORBIDDEN_PATH = `${OPS_HOME_PATH}?error=forbidden`;

export type OpsGreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0] || undefined;
  return value || undefined;
}

export function opsHomeHref(query?: Record<string, string | string[] | undefined>) {
  if (!query) return OPS_HOME_PATH;
  const qs = new URLSearchParams();
  for (const [key, raw] of Object.entries(query)) {
    const value = firstSearchParam(raw);
    if (value) qs.set(key, value);
  }
  const suffix = qs.toString();
  return suffix ? `${OPS_HOME_PATH}?${suffix}` : OPS_HOME_PATH;
}

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
