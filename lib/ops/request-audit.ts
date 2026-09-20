import { headers } from 'next/headers';

export type RequestAudit = {
  ip: string | null;
  userAgent: string | null;
};

function clientIpFromHeaders(h: Headers): string | null {
  const vercel = h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  if (vercel) return vercel;
  const real = h.get('x-real-ip')?.trim();
  if (real) return real;
  const cf = h.get('cf-connecting-ip')?.trim();
  if (cf) return cf;
  const forwarded = h.get('x-forwarded-for');
  if (!forwarded) return null;
  const hops = forwarded.split(',').map((s) => s.trim()).filter(Boolean);
  return hops.at(-1) || null;
}

export async function getRequestAudit(): Promise<RequestAudit> {
  const h = await headers();
  return {
    ip: clientIpFromHeaders(h),
    userAgent: h.get('user-agent'),
  };
}

export function requestAuditFromHeaders(h: Headers): RequestAudit {
  return {
    ip: clientIpFromHeaders(h),
    userAgent: h.get('user-agent'),
  };
}
