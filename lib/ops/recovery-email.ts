import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendClientEmail } from '@/lib/ops/email';
import {
  templatePasswordRecoveryHtml,
  templatePortalPasswordRecoveryHtml,
} from '@/lib/ops/email-templates';
import { withRecoveryOtpParams } from '@/lib/ops/auth-urls';
import { getT } from '@/i18n/locale';
import { tSync } from '@/i18n/translate';
import type { Locale } from '@/i18n/config';
import { authErrorMessage } from '@/lib/user-error';

export type ResetResult =
  | { ok: true; message: string }
  | { ok: false; message: string; code?: 'rate_limited' };

async function sendSupabaseRecoveryEmail(
  email: string,
  redirectTo: string,
  locale: Locale
): Promise<ResetResult | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const client = createSupabaseClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    console.error('resetPasswordForEmail:', error);
    return { ok: false, message: authErrorMessage(error.message, (key) => tSync(locale, key)) };
  }
  return {
    ok: true,
    message: tSync(locale, 'auth.sentSupabase'),
  };
}

/** Genera el enlace de recuperación y lo manda por correo. Sin chequeo de permisos. */
export async function sendRecoveryEmail(
  email: string,
  redirectTo: string,
  options?: { projectName?: string }
): Promise<ResetResult> {
  const t = await getT();
  const locale = t.locale;
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: email.toLowerCase().trim(),
    options: { redirectTo },
  });

  if (error) {
    console.error('generateLink recovery:', error);
    const fallback = await sendSupabaseRecoveryEmail(email, redirectTo, locale);
    if (fallback?.ok) return fallback;
    return {
      ok: false,
      message: error.message.includes('redirect')
        ? t('auth.redirectNotAllowed')
        : t('auth.generateFailed'),
    };
  }

  const hashedToken = data?.properties?.hashed_token;
  const actionLink = data?.properties?.action_link;
  let link = actionLink;
  if (hashedToken) {
    try {
      link = withRecoveryOtpParams(redirectTo, hashedToken);
    } catch {
      link = actionLink;
    }
  }
  if (!link) {
    return { ok: false, message: t('auth.noLink') };
  }

  const html = options?.projectName
    ? templatePortalPasswordRecoveryHtml(options.projectName, link, locale)
    : templatePasswordRecoveryHtml(link, locale);

  const mail = await sendClientEmail({
    to: email,
    subject: options?.projectName
      ? `${t('email.portalRecovery.title')} - ${options.projectName}`
      : `${t('email.recovery.title')} - Codiva.dev`,
    html,
  });

  if (mail.ok) {
    return {
      ok: true,
      message: t('auth.sent'),
    };
  }

  console.error('Resend failed, trying Supabase email fallback:', mail.error);

  const fallback = await sendSupabaseRecoveryEmail(email, redirectTo, locale);
  if (fallback?.ok) return fallback;

  return {
    ok: false,
    message: t('auth.sendFailed'),
  };
}
