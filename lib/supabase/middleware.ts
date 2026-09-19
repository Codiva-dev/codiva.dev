import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isSupabaseAnonConfigured } from '@/lib/supabase/session-refresh';

export async function updateSession(request: NextRequest, options?: { refreshUser?: boolean }) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-codiva-path', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  const passthrough = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (options?.refreshUser === false || !isSupabaseAnonConfigured()) {
    return passthrough;
  }

  let supabaseResponse = passthrough;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
            supabaseResponse.cookies.set(name, value, cookieOptions)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}
