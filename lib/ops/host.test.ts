import { afterEach, describe, expect, it } from 'vitest';
import {
  careerAppHref,
  getHostname,
  interviewsAppHref,
  isCareerHost,
  isInterviewsHost,
  isOpsHost,
  isPortalHost,
  isTicketHost,
  resolveSurface,
  usageUrlLabel,
} from './host';

const ENV_KEYS = [
  'OPS_HOST',
  'PORTAL_HOST',
  'CAREER_HOST',
  'TICKET_HOST',
  'INTERVIEWS_HOST',
  'NEXT_PUBLIC_OPS_URL',
  'NEXT_PUBLIC_PORTAL_URL',
  'NEXT_PUBLIC_CAREER_URL',
  'NEXT_PUBLIC_TICKET_URL',
  'NEXT_PUBLIC_INTERVIEWS_URL',
  'NEXT_PUBLIC_APP_URL',
] as const;

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

describe('host surfaces', () => {
  it('strips the port from Host', () => {
    expect(getHostname('ops.localhost:3000')).toBe('ops.localhost');
  });

  it('classifies production hosts', () => {
    expect(resolveSurface('ops.codiva.dev')).toBe('ops');
    expect(resolveSurface('portal.codiva.dev')).toBe('portal');
    expect(resolveSurface('career.codiva.dev')).toBe('career');
    expect(resolveSurface('ticket.codiva.dev')).toBe('ticket');
    expect(resolveSurface('interviews.codiva.dev')).toBe('interviews');
    expect(resolveSurface('codiva.dev')).toBe('marketing');
    expect(resolveSurface('www.codiva.dev')).toBe('marketing');
  });

  it('classifies local hosts', () => {
    expect(isOpsHost('ops.localhost:3000')).toBe(true);
    expect(isPortalHost('portal.localhost')).toBe(true);
    expect(isCareerHost('career.localhost')).toBe(true);
    expect(isTicketHost('ticket.localhost')).toBe(true);
    expect(isInterviewsHost('interviews.localhost:3000')).toBe(true);
  });

  it('career href omits /empleos on the career host', () => {
    expect(careerAppHref('career.codiva.dev', '/nirc-qa')).toBe('/nirc-qa');
    expect(careerAppHref('codiva.dev', '/nirc-qa')).toBe('/empleos/nirc-qa');
    expect(careerAppHref('career.codiva.dev', '/')).toBe('/');
  });

  it('interview href omits /entrevistas on the interviews host', () => {
    const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    expect(interviewsAppHref('interviews.codiva.dev', '/')).toBe('/');
    expect(interviewsAppHref('interviews.codiva.dev', `/${id}`)).toBe(`/${id}`);
    expect(interviewsAppHref('ops.codiva.dev', '/')).toBe('/entrevistas');
    expect(interviewsAppHref('ops.codiva.dev', `/${id}`)).toBe(`/entrevistas/${id}`);
    expect(interviewsAppHref('interviews.codiva.dev', `/intento/${id}`)).toBe(`/intento/${id}`);
    expect(interviewsAppHref('ops.codiva.dev', `/intento/${id}`)).toBe(`/entrevistas/intento/${id}`);
    expect(interviewsAppHref('ops.codiva.dev', '/cuenta')).toBe('/entrevistas/cuenta');
  });

  it('usage labels drop the protocol', () => {
    expect(usageUrlLabel('https://portal.codiva.dev/p/nirc')).toBe('portal.codiva.dev/p/nirc');
  });
});
