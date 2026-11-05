import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveStaffForApi } from '@/lib/ops/interview-file-access';
import { opsBaseUrl } from '@/lib/ops/host';
import { throwDb } from '@/lib/ops/throw-db';
import {
  exchangeGoogleAuthCode,
  googleOAuthStateCookieName,
  isGoogleCalendarConfigured,
  parseGoogleIdToken,
  verifyGoogleOAuthState,
} from '@/lib/ops/google-calendar';

export const runtime = 'nodejs';

function redirectSettings(code: string) {
  return NextResponse.redirect(`${opsBaseUrl()}/settings?gcal=${code}`);
}

export async function GET(request: Request) {
  if (!isGoogleCalendarConfigured()) return redirectSettings('not_configured');

  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  if (error) return redirectSettings('denied');

  const code = url.searchParams.get('code')?.trim() || '';
  const state = url.searchParams.get('state')?.trim() || '';
  if (!code || !state) return redirectSettings('invalid');

  const cookieHeader = request.headers.get('cookie') || '';
  const cookieMatch = cookieHeader
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${googleOAuthStateCookieName()}=`));
  const cookieState = cookieMatch ? decodeURIComponent(cookieMatch.split('=').slice(1).join('=')) : '';
  if (!cookieState || cookieState !== state) return redirectSettings('invalid');

  const verified = verifyGoogleOAuthState(state);
  if (!verified.ok) return redirectSettings('invalid');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id !== verified.staffId) return redirectSettings('invalid');
  const staff = await getActiveStaffForApi(supabase, user.id);
  if (!staff) return redirectSettings('invalid');

  const tokens = await exchangeGoogleAuthCode(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    return redirectSettings(tokens.refresh_token ? 'token_error' : 'no_refresh');
  }
  const identity = tokens.id_token ? parseGoogleIdToken(tokens.id_token) : null;
  if (!identity) return redirectSettings('token_error');

  const expiresIn = Number(tokens.expires_in) || 3600;
  const scopes = String(tokens.scope || '')
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const admin = createAdminClient();
  const { data: taken } = await admin
    .from('ops_google_calendar_links')
    .select('staff_id')
    .eq('google_sub', identity.sub)
    .neq('staff_id', user.id)
    .maybeSingle();
  if (taken) return redirectSettings('taken');

  const { error: upsertError } = await admin.from('ops_google_calendar_links').upsert(
    {
      staff_id: user.id,
      google_sub: identity.sub,
      google_email: identity.email,
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      access_token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      calendar_id: 'primary',
      scopes,
      linked_at: new Date().toISOString(),
      last_error: null,
    },
    { onConflict: 'staff_id' }
  );
  if (upsertError) throw await throwDb(upsertError);

  const res = redirectSettings('linked');
  res.cookies.set(googleOAuthStateCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
