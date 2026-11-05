import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveStaffForApi } from '@/lib/ops/interview-file-access';
import { opsBaseUrl } from '@/lib/ops/host';
import {
  buildGoogleAuthUrl,
  googleOAuthStateCookieName,
  isGoogleCalendarConfigured,
  signGoogleOAuthState,
} from '@/lib/ops/google-calendar';

export const runtime = 'nodejs';

export async function GET() {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(`${opsBaseUrl()}/settings?gcal=not_configured`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${opsBaseUrl()}/login`);
  const staff = await getActiveStaffForApi(supabase, user.id);
  if (!staff) return NextResponse.redirect(`${opsBaseUrl()}/login`);

  const state = signGoogleOAuthState(user.id);
  const res = NextResponse.redirect(buildGoogleAuthUrl(state));
  res.cookies.set(googleOAuthStateCookieName(), state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 15 * 60,
  });
  return res;
}
