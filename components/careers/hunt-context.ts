import {
  HUNT_PROGRESS_EVENT,
  HUNT_SESSION_EVENT,
  parseHuntCookieHeader,
  serializeHuntCookie,
} from '@/lib/careers/hunt/cookie';

export { HUNT_PROGRESS_EVENT, HUNT_SESSION_EVENT } from '@/lib/careers/hunt/cookie';

export type HuntContext = {
  jobPostingId: string;
  token: string;
  discipline?: string;
};

const TOKEN_KEY = (jobPostingId: string, discipline?: string) =>
  discipline
    ? `codiva.career.attempt.${jobPostingId}.${discipline}`
    : `codiva.career.attempt.${jobPostingId}`;

const HUNT_CTX_KEY = 'codiva.career.hunt';

export function readHuntCookie(): string {
  if (typeof document === 'undefined') return '';
  return parseHuntCookieHeader(document.cookie);
}

export function writeHuntCookie(token: string) {
  if (typeof document === 'undefined' || token.length < 16) return;
  document.cookie = serializeHuntCookie(
    token,
    window.location.hostname,
    window.location.protocol === 'https:'
  );
}

export function announceHuntSession() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(HUNT_SESSION_EVENT));
}

export function announceHuntProgress() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(HUNT_PROGRESS_EVENT));
}

export function readAttemptToken(jobPostingId: string, discipline?: string): string {
  if (typeof window === 'undefined') return '';
  return (
    readHuntCookie() ||
    sessionStorage.getItem(TOKEN_KEY(jobPostingId, discipline)) ||
    localStorage.getItem(TOKEN_KEY(jobPostingId, discipline)) ||
    ''
  );
}

export function writeAttemptToken(jobPostingId: string, token: string, discipline?: string) {
  sessionStorage.setItem(TOKEN_KEY(jobPostingId, discipline), token);
  localStorage.setItem(TOKEN_KEY(jobPostingId, discipline), token);
  writeHuntCookie(token);
  writeHuntContext({ jobPostingId, token, discipline });
}

export function writeHuntContext(ctx: HuntContext) {
  if (typeof window === 'undefined') return;
  const payload = JSON.stringify(ctx);
  sessionStorage.setItem(HUNT_CTX_KEY, payload);
  localStorage.setItem(HUNT_CTX_KEY, payload);
  writeHuntCookie(ctx.token);
}

export function readHuntContext(): HuntContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(HUNT_CTX_KEY) || localStorage.getItem(HUNT_CTX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HuntContext;
    if (!parsed?.token || !parsed?.jobPostingId) return null;
    return parsed;
  } catch {
    return null;
  }
}
