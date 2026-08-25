'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendClientEmail } from '@/lib/ops/email';
import {
  templatePasswordRecoveryHtml,
  templatePortalPasswordRecoveryHtml,
} from '@/lib/ops/email-templates';
import {
  interviewsAuthCallbackUrl,
  opsAuthCallbackUrl,
  portalAuthCallbackUrl,
  portalHubAuthCallbackUrl,
  withRecoveryOtpParams,
} from '@/lib/ops/auth-urls';
import { findUserIdByEmail } from '@/lib/ops/auth-users';
import { getT } from '@/i18n/locale';
import { tSync } from '@/i18n/translate';
import type { Locale } from '@/i18n/config';
import { authErrorMessage } from '@/lib/user-error';
import { getRequestAudit } from '@/lib/ops/request-audit';
import { PUBLIC_RL_AUTH, STAFF_RL_PASSWORD_CHANGE, consumeRateLimit } from '@/lib/rate-limit';

type ResetResult =
  | { ok: true; message: string }
  | { ok: false; message: string; code?: 'rate_limited' };

export { findUserIdByEmail };

async function enforcePasswordResetRateLimit(email: string): Promise<ResetResult | null> {
  const t = await getT();
  const audit = await getRequestAudit();
  const ip = audit.ip || 'unknown';
  const ipRl = await consumeRateLimit(`auth_reset_ip:${ip}`, PUBLIC_RL_AUTH.windowMs, PUBLIC_RL_AUTH.max);
  if (!ipRl.ok) return { ok: false, message: t('auth.rateLimited'), code: 'rate_limited' };
  const emailRl = await consumeRateLimit(
    `auth_reset_email:${email}`,
    PUBLIC_RL_AUTH.emailWindowMs,
    PUBLIC_RL_AUTH.emailMax
  );
  if (!emailRl.ok) return { ok: false, message: t('auth.rateLimited'), code: 'rate_limited' };
  return null;
}

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

async function sendRecoveryEmail(
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

export async function requestStaffPasswordReset(email: string): Promise<ResetResult> {
  const t = await getT();
  const normalized = email.toLowerCase().trim();
  if (!normalized) {
    return { ok: false, message: t('auth.emailRequired') };
  }

  const limited = await enforcePasswordResetRateLimit(normalized);
  if (limited) return limited;

  const userId = await findUserIdByEmail(normalized);
  if (!userId) {
    return {
      ok: true,
      message: t('auth.staffIfExists'),
    };
  }

  const admin = createAdminClient();
  const { data: staff } = await admin
    .from('staff_profiles')
    .select('id, active')
    .eq('id', userId)
    .eq('active', true)
    .maybeSingle();

  if (!staff) {
    return {
      ok: true,
      message: t('auth.staffIfExists'),
    };
  }

  return sendRecoveryEmail(normalized, opsAuthCallbackUrl('/reset-password'));
}

export async function requestPortalPasswordReset(
  email: string,
  slug: string
): Promise<ResetResult> {
  const t = await getT();
  const normalized = email.toLowerCase().trim();
  if (!normalized || !slug) {
    return { ok: false, message: t('auth.incomplete') };
  }

  const limited = await enforcePasswordResetRateLimit(normalized);
  if (limited) return limited;

  const admin = createAdminClient();

  const { data: project } = await admin
    .from('projects')
    .select('id, name')
    .eq('slug', slug)
    .eq('client_visible', true)
    .maybeSingle();

  if (!project) {
    return {
      ok: true,
      message: t('auth.portalIfExists'),
    };
  }

  const userId = await findUserIdByEmail(normalized);
  if (!userId) {
    return {
      ok: true,
      message: t('auth.portalIfExists'),
    };
  }

  const { data: member } = await admin
    .from('project_members')
    .select('id')
    .eq('project_id', project.id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!member) {
    return {
      ok: true,
      message: t('auth.portalIfExists'),
    };
  }

  return sendRecoveryEmail(
    normalized,
    portalAuthCallbackUrl(slug, `/p/${slug}/reset-password`),
    { projectName: project.name }
  );
}

/** Recuperación desde el login hub (sin slug): usa el primer proyecto visible del miembro. */
export async function requestPortalHubPasswordReset(email: string): Promise<ResetResult> {
  const t = await getT();
  const normalized = email.toLowerCase().trim();
  if (!normalized) {
    return { ok: false, message: t('auth.incomplete') };
  }

  const limited = await enforcePasswordResetRateLimit(normalized);
  if (limited) return limited;

  const admin = createAdminClient();
  const userId = await findUserIdByEmail(normalized);
  if (!userId) {
    return {
      ok: true,
      message: t('auth.hubIfExists'),
    };
  }

  const { data: member } = await admin
    .from('project_members')
    .select('project_id, projects!inner(id, name, slug, client_visible)')
    .eq('user_id', userId)
    .limit(20);

  const project = (member ?? [])
    .map((row) => {
      const raw = row.projects as
        | { id: string; name: string; slug: string; client_visible: boolean }
        | { id: string; name: string; slug: string; client_visible: boolean }[]
        | null;
      return Array.isArray(raw) ? raw[0] : raw;
    })
    .find((p) => p && p.client_visible);

  if (!project) {
    return {
      ok: true,
      message: t('auth.hubIfExists'),
    };
  }

  return sendRecoveryEmail(
    normalized,
    portalHubAuthCallbackUrl('/reset-password'),
    { projectName: project.name }
  );
}

export async function requestInterviewPasswordReset(email: string): Promise<ResetResult> {
  const t = await getT();
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: false, message: t('auth.emailRequired') };

  const limited = await enforcePasswordResetRateLimit(normalized);
  if (limited) return limited;

  const userId = await findUserIdByEmail(normalized);
  if (!userId) {
    return { ok: true, message: t('auth.hubIfExists') };
  }

  const admin = createAdminClient();
  const { data: member } = await admin
    .from('ops_recruiting_partner_members')
    .select('id, active, ops_recruiting_partners!inner(active)')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  const partner = member?.ops_recruiting_partners as { active?: boolean } | { active?: boolean }[] | null;
  const org = Array.isArray(partner) ? partner[0] : partner;
  if (!member?.id || org?.active === false) {
    return { ok: true, message: t('auth.hubIfExists') };
  }

  return sendRecoveryEmail(normalized, interviewsAuthCallbackUrl('/reset-password'));
}

export async function updatePassword(newPassword: string): Promise<ResetResult> {
  const t = await getT();
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, message: t('auth.minLength') };
  }

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: t('auth.sessionExpired') };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { ok: false, message: authErrorMessage(error.message, t) };
  }

  return { ok: true, message: t('auth.updated') };
}

/** Cambio de contraseña desde el perfil de staff (requiere la actual). */
export async function changeStaffPassword(
  currentPassword: string,
  newPassword: string
): Promise<ResetResult> {
  const t = await getT();
  if (!currentPassword) {
    return { ok: false, message: t('ops.settings.currentPasswordWrong') };
  }
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, message: t('auth.minLength') };
  }
  if (currentPassword === newPassword) {
    return { ok: false, message: t('ops.settings.passwordSame') };
  }

  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { ok: false, message: t('ops.settings.passwordSessionExpired') };
  }

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id')
    .eq('id', user.id)
    .eq('active', true)
    .maybeSingle();

  if (!staff) {
    return { ok: false, message: t('ops.settings.passwordSessionExpired') };
  }

  const audit = await getRequestAudit();
  const ip = audit.ip || 'unknown';
  const ipRl = await consumeRateLimit(
    `auth_change_ip:${ip}`,
    STAFF_RL_PASSWORD_CHANGE.windowMs,
    STAFF_RL_PASSWORD_CHANGE.max
  );
  const userRl = await consumeRateLimit(
    `auth_change_user:${user.id}`,
    STAFF_RL_PASSWORD_CHANGE.windowMs,
    STAFF_RL_PASSWORD_CHANGE.max
  );
  if (!ipRl.ok || !userRl.ok) {
    return { ok: false, message: t('auth.rateLimited'), code: 'rate_limited' };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return { ok: false, message: t('ops.settings.currentPasswordWrong') };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    return { ok: false, message: authErrorMessage(error.message, t) };
  }

  return { ok: true, message: t('ops.settings.passwordUpdated') };
}
