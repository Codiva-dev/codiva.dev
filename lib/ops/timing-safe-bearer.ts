import { timingSafeEqual } from 'node:crypto';

export function timingSafeBearer(header: string | null | undefined, expected: string): boolean {
  const secret = expected.trim();
  if (!secret || !header?.startsWith('Bearer ')) return false;
  const given = header.slice(7);
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function cronAuthorized(header: string | null | undefined): boolean {
  const secret = process.env.CRON_SECRET?.trim() ?? '';
  if (!secret) return false;
  return timingSafeBearer(header, secret);
}
