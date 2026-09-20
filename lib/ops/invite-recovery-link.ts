import { createAdminClient } from '@/lib/supabase/admin';
import { withRecoveryOtpParams } from '@/lib/ops/auth-urls';

export async function generateInviteRecoveryLink(email: string, redirectTo: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: email.toLowerCase().trim(),
    options: { redirectTo },
  });
  if (error || !data) {
    console.error('[invite recovery link]', error);
    throw new Error('No se pudo generar el enlace de acceso');
  }
  const hashedToken = data.properties?.hashed_token;
  if (hashedToken) {
    try {
      return withRecoveryOtpParams(redirectTo, hashedToken);
    } catch {
      /* fall through */
    }
  }
  const actionLink = data.properties?.action_link;
  if (!actionLink) throw new Error('No se pudo generar el enlace de acceso');
  return actionLink;
}
