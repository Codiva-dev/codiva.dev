import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  isOpsHost,
  isPortalHost,
  isCareerHost,
  isTicketHost,
  isInterviewsHost,
  opsBaseUrl,
  portalBaseUrl,
  marketingBaseUrl,
  careerBaseUrl,
  ticketBaseUrl,
  interviewsBaseUrl,
} from '@/lib/ops/host';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  localeFromAcceptLanguage,
} from '@/i18n/config';

function localeCookieOptions() {
  return {
    path: '/',
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: 'lax' as const,
  };
}

function resolveRequestLocale(request: NextRequest) {
  const fromCookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  return localeFromAcceptLanguage(request.headers.get('accept-language')) || DEFAULT_LOCALE;
}

function persistLocaleCookie(request: NextRequest, response: NextResponse) {
  const locale = resolveRequestLocale(request);
  if (!isLocale(request.cookies.get(LOCALE_COOKIE)?.value)) {
    response.cookies.set(LOCALE_COOKIE, locale, localeCookieOptions());
  }
  return response;
}

function withSessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((c) => {
    to.cookies.set(c.name, c.value);
  });
  return to;
}

function absoluteRedirect(request: NextRequest, base: string, path: string) {
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
  request.nextUrl.searchParams.forEach((value, key) => {
    if (!url.searchParams.has(key)) url.searchParams.set(key, value);
  });
  return NextResponse.redirect(url);
}

const CAREER_RESERVED = new Set([
  'empleos',
  'legal',
  'ops',
  'login',
  'dashboard',
  'ticket',
  'cotiza',
  'proyectos',
  'cuenta',
  'partner',
  'client-packs',
  'auth',
  'api',
  'inbox',
  'leads',
  'projects',
  'users',
  'team',
  'settings',
  'tickets',
  'organizations',
  'workload',
  'asignaciones',
  'pendientes',
  'q',
  'p',
  'entrevistas',
  'interviews',
  'aceptar',
  'robots.txt',
  'sitemap.xml',
]);

const INTERVIEW_APP_ID = /^\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/?$/i;

function isLocalApex(host: string | null) {
  const hostname = (host ?? '').split(':')[0].toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function careerFirstSegment(pathname: string) {
  return (pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
}

function isPublicTicketPath(pathname: string) {
  return pathname === '/ticket' || pathname.startsWith('/ticket/');
}

function isEntrevistasPublicPath(pathname: string) {
  return pathname === '/entrevistas' || pathname.startsWith('/entrevistas/');
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const { pathname } = request.nextUrl;
  const sessionResponse = persistLocaleCookie(request, await updateSession(request));

  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return sessionResponse;
  }

  if (pathname.startsWith('/client-packs')) {
    const missing = request.nextUrl.clone();
    missing.pathname = '/ops/__missing';
    return withSessionCookies(sessionResponse, NextResponse.rewrite(missing));
  }

  const onOps = isOpsHost(host);
  const onPortal = isPortalHost(host);
  const onCareer = isCareerHost(host);
  const onTicket = isTicketHost(host);
  const onInterviews = isInterviewsHost(host);

  // --- TICKET (formulario público) ---
  if (onTicket) {
    if (
      pathname.startsWith('/legal') ||
      pathname === '/cotiza' ||
      pathname.startsWith('/cotiza/')
    ) {
      return withSessionCookies(
        sessionResponse,
        absoluteRedirect(request, marketingBaseUrl(), pathname)
      );
    }

    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/projects') ||
      pathname.startsWith('/leads') ||
      pathname.startsWith('/partner') ||
      pathname.startsWith('/q/') ||
      pathname.startsWith('/ops') ||
      pathname === '/tickets' ||
      pathname.startsWith('/tickets/')
    ) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, opsBaseUrl(), pathname));
    }

    if (pathname.startsWith('/p/') || pathname === '/proyectos' || pathname.startsWith('/proyectos/') || pathname === '/cuenta' || pathname.startsWith('/cuenta/')) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, portalBaseUrl(), pathname));
    }

    if (pathname === '/empleos' || pathname.startsWith('/empleos/')) {
      const rest =
        pathname === '/empleos' || pathname === '/empleos/' ? '/' : pathname.slice('/empleos'.length);
      return withSessionCookies(sessionResponse, absoluteRedirect(request, careerBaseUrl(), rest));
    }

    if (isPublicTicketPath(pathname)) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, ticketBaseUrl(), '/'));
    }

    if (isEntrevistasPublicPath(pathname)) {
      const rest =
        pathname === '/entrevistas' || pathname === '/entrevistas/' ? '/' : pathname.slice('/entrevistas'.length);
      return withSessionCookies(sessionResponse, absoluteRedirect(request, interviewsBaseUrl(), rest || '/'));
    }

    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone();
      url.pathname = '/ticket';
      return withSessionCookies(sessionResponse, NextResponse.rewrite(url));
    }

    const missing = request.nextUrl.clone();
    missing.pathname = '/ops/__missing';
    return withSessionCookies(sessionResponse, NextResponse.rewrite(missing));
  }

  // --- INTERVIEWS (terceros de entrevistas) ---
  if (onInterviews) {
    if (pathname.startsWith('/legal') || pathname.startsWith('/auth/')) {
      if (pathname.startsWith('/auth/')) {
        const url = request.nextUrl.clone();
        url.pathname = `/ops${pathname}`;
        return withSessionCookies(sessionResponse, NextResponse.rewrite(url));
      }
      return sessionResponse;
    }

    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/projects') ||
      pathname.startsWith('/leads') ||
      pathname.startsWith('/partner') ||
      pathname.startsWith('/q/') ||
      pathname.startsWith('/ops')
    ) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, opsBaseUrl(), pathname));
    }

    if (pathname.startsWith('/p/') || pathname === '/proyectos' || pathname.startsWith('/proyectos/')) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, portalBaseUrl(), pathname));
    }

    if (pathname === '/empleos' || pathname.startsWith('/empleos/')) {
      const rest =
        pathname === '/empleos' || pathname === '/empleos/' ? '/' : pathname.slice('/empleos'.length);
      return withSessionCookies(sessionResponse, absoluteRedirect(request, careerBaseUrl(), rest));
    }

    if (isPublicTicketPath(pathname)) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, ticketBaseUrl(), '/'));
    }

    if (isEntrevistasPublicPath(pathname)) {
      const rest =
        pathname === '/entrevistas' || pathname === '/entrevistas/' ? '/' : pathname.slice('/entrevistas'.length);
      return withSessionCookies(sessionResponse, absoluteRedirect(request, interviewsBaseUrl(), rest || '/'));
    }

    const interviewsRewrite =
      pathname === '/' || pathname === ''
        ? '/ops/entrevistas'
        : pathname === '/login' ||
            pathname.startsWith('/login/') ||
            pathname === '/cuenta' ||
            pathname.startsWith('/cuenta/') ||
            pathname === '/aceptar' ||
            pathname.startsWith('/aceptar/') ||
            pathname === '/reset-password' ||
            pathname.startsWith('/reset-password/') ||
            INTERVIEW_APP_ID.test(pathname)
          ? `/ops/entrevistas${pathname === '/' ? '' : pathname}`
          : null;

    if (interviewsRewrite) {
      const url = request.nextUrl.clone();
      url.pathname = interviewsRewrite;
      return withSessionCookies(sessionResponse, NextResponse.rewrite(url));
    }

    const missing = request.nextUrl.clone();
    missing.pathname = '/ops/__missing';
    return withSessionCookies(sessionResponse, NextResponse.rewrite(missing));
  }

  // --- CAREER (bolsa pública) ---
  if (onCareer) {
    if (
      pathname.startsWith('/legal') ||
      pathname === '/cotiza' ||
      pathname.startsWith('/cotiza/')
    ) {
      return withSessionCookies(
        sessionResponse,
        absoluteRedirect(request, marketingBaseUrl(), pathname)
      );
    }

    if (isPublicTicketPath(pathname)) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, ticketBaseUrl(), '/'));
    }

    if (isEntrevistasPublicPath(pathname)) {
      const rest =
        pathname === '/entrevistas' || pathname === '/entrevistas/' ? '/' : pathname.slice('/entrevistas'.length);
      return withSessionCookies(sessionResponse, absoluteRedirect(request, interviewsBaseUrl(), rest || '/'));
    }

    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/projects') ||
      pathname.startsWith('/leads') ||
      pathname.startsWith('/partner') ||
      pathname.startsWith('/q/') ||
      pathname.startsWith('/ops')
    ) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, opsBaseUrl(), pathname));
    }

    if (pathname.startsWith('/p/') || pathname === '/proyectos' || pathname.startsWith('/proyectos/') || pathname === '/cuenta' || pathname.startsWith('/cuenta/')) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, portalBaseUrl(), pathname));
    }

    if (pathname === '/empleos' || pathname === '/empleos/') {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, careerBaseUrl(), '/'));
    }

    if (pathname.startsWith('/empleos/')) {
      const rest = pathname.slice('/empleos'.length);
      return withSessionCookies(sessionResponse, absoluteRedirect(request, careerBaseUrl(), rest));
    }

    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone();
      url.pathname = '/empleos';
      return withSessionCookies(sessionResponse, NextResponse.rewrite(url));
    }

    const first = careerFirstSegment(pathname);
    if (!CAREER_RESERVED.has(first)) {
      const url = request.nextUrl.clone();
      url.pathname = `/empleos${pathname}`;
      return withSessionCookies(sessionResponse, NextResponse.rewrite(url));
    }

    const missing = request.nextUrl.clone();
    missing.pathname = '/ops/__missing';
    return withSessionCookies(sessionResponse, NextResponse.rewrite(missing));
  }

  // --- PORTAL (clientes) ---
  if (onPortal) {
    if (pathname.startsWith('/legal') || pathname.startsWith('/auth/')) {
      if (pathname.startsWith('/auth/')) {
        const url = request.nextUrl.clone();
        url.pathname = `/ops${pathname}`;
        return withSessionCookies(sessionResponse, NextResponse.rewrite(url));
      }
      return sessionResponse;
    }

    if (pathname === '/' || pathname === '') {
      return withSessionCookies(
        sessionResponse,
        absoluteRedirect(request, portalBaseUrl(), '/proyectos')
      );
    }

    if (
      pathname === '/login' ||
      pathname.startsWith('/login/') ||
      pathname === '/proyectos' ||
      pathname.startsWith('/proyectos/') ||
      pathname === '/cuenta' ||
      pathname.startsWith('/cuenta/') ||
      pathname === '/reset-password' ||
      pathname.startsWith('/reset-password/')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/ops/portal${pathname}`;
      return withSessionCookies(sessionResponse, NextResponse.rewrite(url));
    }

    if (pathname.startsWith('/p/')) {
      const url = request.nextUrl.clone();
      url.pathname = `/ops${pathname}`;
      const rewritten = withSessionCookies(sessionResponse, NextResponse.rewrite(url));
      if (/\/p\/[^/]+\/sitio\/?$/.test(pathname)) {
        rewritten.headers.set('Cache-Control', 'private, no-store');
        rewritten.headers.set('Pragma', 'no-cache');
      }
      return rewritten;
    }

    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/projects') ||
      pathname.startsWith('/leads') ||
      pathname.startsWith('/partner') ||
      pathname.startsWith('/q/')
    ) {
      return withSessionCookies(
        sessionResponse,
        absoluteRedirect(request, opsBaseUrl(), pathname)
      );
    }

    if (pathname === '/empleos' || pathname.startsWith('/empleos/')) {
      const rest =
        pathname === '/empleos' || pathname === '/empleos/' ? '/' : pathname.slice('/empleos'.length);
      return withSessionCookies(sessionResponse, absoluteRedirect(request, careerBaseUrl(), rest));
    }

    if (isPublicTicketPath(pathname)) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, ticketBaseUrl(), '/'));
    }

    if (isEntrevistasPublicPath(pathname)) {
      const rest =
        pathname === '/entrevistas' || pathname === '/entrevistas/' ? '/' : pathname.slice('/entrevistas'.length);
      return withSessionCookies(sessionResponse, absoluteRedirect(request, interviewsBaseUrl(), rest || '/'));
    }

    const missing = request.nextUrl.clone();
    missing.pathname = '/ops/__missing';
    return withSessionCookies(sessionResponse, NextResponse.rewrite(missing));
  }

  // --- OPS (staff) ---
  if (onOps) {
    if (pathname.startsWith('/legal')) {
      return sessionResponse;
    }

    if (pathname === '/empleos' || pathname.startsWith('/empleos/')) {
      const rest =
        pathname === '/empleos' || pathname === '/empleos/' ? '/' : pathname.slice('/empleos'.length);
      return withSessionCookies(sessionResponse, absoluteRedirect(request, careerBaseUrl(), rest));
    }

    if (isPublicTicketPath(pathname)) {
      return withSessionCookies(sessionResponse, absoluteRedirect(request, ticketBaseUrl(), '/'));
    }

    if (pathname === '/ops' || pathname === '/ops/') {
      return withSessionCookies(
        sessionResponse,
        absoluteRedirect(request, opsBaseUrl(), '/dashboard')
      );
    }
    if (pathname.startsWith('/ops/')) {
      const rest = pathname.slice('/ops'.length) || '/';
      return withSessionCookies(sessionResponse, absoluteRedirect(request, opsBaseUrl(), rest));
    }

    if (!pathname.startsWith('/ops')) {
      const url = request.nextUrl.clone();
      if (pathname === '/') {
        url.pathname = '/ops/dashboard';
      } else {
        url.pathname = `/ops${pathname}`;
      }
      const rewritten = withSessionCookies(sessionResponse, NextResponse.rewrite(url));
      if (/\/p\/[^/]+\/sitio\/?$/.test(pathname) || /\/ops\/p\/[^/]+\/sitio\/?$/.test(pathname)) {
        rewritten.headers.set('Cache-Control', 'private, no-store');
        rewritten.headers.set('Pragma', 'no-cache');
      }
      return rewritten;
    }

    if (/\/ops\/p\/[^/]+\/sitio\/?$/.test(pathname)) {
      sessionResponse.headers.set('Cache-Control', 'private, no-store');
      sessionResponse.headers.set('Pragma', 'no-cache');
    }

    return sessionResponse;
  }

  // --- MARKETING ---
  if (pathname === '/ops' || pathname === '/ops/' || pathname.startsWith('/ops/')) {
    const rest =
      pathname === '/ops' || pathname === '/ops/' ? '/dashboard' : pathname.slice('/ops'.length);
    return withSessionCookies(
      sessionResponse,
      absoluteRedirect(request, opsBaseUrl(), rest || '/dashboard')
    );
  }

  if (
    pathname.startsWith('/p/') ||
    pathname === '/cuenta' ||
    pathname.startsWith('/cuenta/') ||
    pathname === '/proyectos' ||
    pathname.startsWith('/proyectos/') ||
    pathname === '/login' ||
    pathname.startsWith('/login/')
  ) {
    return withSessionCookies(
      sessionResponse,
      absoluteRedirect(request, portalBaseUrl(), pathname)
    );
  }

  if (
    pathname.startsWith('/q/') ||
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/projects' ||
    pathname.startsWith('/projects/') ||
    pathname === '/partner' ||
    pathname.startsWith('/partner/')
  ) {
    return withSessionCookies(sessionResponse, absoluteRedirect(request, opsBaseUrl(), pathname));
  }

  if (pathname === '/empleos' || pathname.startsWith('/empleos/')) {
    if (isLocalApex(host)) return sessionResponse;
    const rest =
      pathname === '/empleos' || pathname === '/empleos/' ? '/' : pathname.slice('/empleos'.length);
    return withSessionCookies(sessionResponse, absoluteRedirect(request, careerBaseUrl(), rest));
  }

  if (isPublicTicketPath(pathname)) {
    if (isLocalApex(host)) return sessionResponse;
    return withSessionCookies(sessionResponse, absoluteRedirect(request, ticketBaseUrl(), '/'));
  }

  if (isEntrevistasPublicPath(pathname)) {
    if (isLocalApex(host)) return sessionResponse;
    const rest =
      pathname === '/entrevistas' || pathname === '/entrevistas/' ? '/' : pathname.slice('/entrevistas'.length);
    return withSessionCookies(sessionResponse, absoluteRedirect(request, interviewsBaseUrl(), rest || '/'));
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
