/** Filtra errores de Postgres, Auth y red para no mostrarlos en la UI. */

const TECHNICAL = [
  /duplicate key/i,
  /unique constraint/i,
  /foreign key constraint/i,
  /violates .+ constraint/i,
  /null value in column/i,
  /not-null constraint/i,
  /permission denied/i,
  /row[- ]level security|\brls\b/i,
  /\bjwt\b|invalid claim/i,
  /pgrst\d+/i,
  /postgrest/i,
  /could not find the (table|function|column|relationship)/i,
  /column ".+" does not exist/i,
  /relation ".+" does not exist/i,
  /function .+ does not exist/i,
  /syntax error at or near/i,
  /invalid input syntax/i,
  /failed to fetch|networkerror|load failed/i,
  /econnrefused|enotfound|etimedout|enonet/i,
  /unexpected token|json\.parse/i,
  /internal server error/i,
  /supabase/i,
  /authapierror/i,
  /\b2350[0-9]\b/,
  /\b42501\b/,
  /an error occurred in the server/i,
  /failed to find server action/i,
  /value too long/i,
  /invalid uuid|uuid.*invalid/i,
  /bad credentials|validation failed/i,
  /missing_token|unauthorized/i,
  /body exceeded|payload too large|request entity too large/i,
];

const SNAKE_CODE = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/;

export function isTechnicalErrorMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return true;
  if (trimmed.length > 180) return true;
  if (SNAKE_CODE.test(trimmed)) return true;
  return TECHNICAL.some((re) => re.test(trimmed));
}

export function isBodyTooLargeError(message: string) {
  return /body exceeded|payload too large|request entity too large/i.test(message);
}

export function toUserErrorMessage(err: unknown, fallback: string): string {
  const msg =
    typeof err === 'string' ? err : err instanceof Error && err.message ? err.message : '';
  if (!msg || isTechnicalErrorMessage(msg)) return fallback;
  return msg;
}

type Translate = (key: string, options?: Record<string, string>) => string;

/** Mapea mensajes de Supabase Auth a copy de producto. */
export function authErrorMessage(raw: string, t: Translate): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login credentials')) return t('portal.login.invalid');
  if (m.includes('email not confirmed')) return t('auth.emailNotConfirmed');
  if (m.includes('already registered') || m.includes('already been registered')) {
    return t('auth.userExists');
  }
  if (m.includes('same password') || m.includes('should be different')) {
    return t('ops.settings.passwordSame');
  }
  if (
    m.includes('weak password') ||
    (m.includes('password') && (m.includes('at least') || m.includes('characters')))
  ) {
    return t('auth.minLength');
  }
  if (m.includes('session') && (m.includes('missing') || m.includes('expired'))) {
    return t('auth.sessionExpired');
  }
  if (
    m.includes('rate limit') ||
    m.includes('only request this after') ||
    m.includes('for security purposes')
  ) {
    return t('auth.rateLimited');
  }
  if (m.includes('token') && (m.includes('expired') || m.includes('invalid'))) {
    return t('auth.sessionExpired');
  }
  if (m.includes('otp') && (m.includes('expired') || m.includes('invalid'))) {
    return t('auth.sessionExpired');
  }
  if (m.includes('redirect') && m.includes('not allowed')) return t('auth.sendFailed');
  return toUserErrorMessage(raw, t('common.status.actionFailed'));
}
