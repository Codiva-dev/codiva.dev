import { createAdminClient } from '@/lib/supabase/admin';
import { throwDb, throwPublic } from '@/lib/ops/throw-db';
import { sendClientEmail } from '@/lib/ops/email';
import {
  templateInterviewInviteExistingUser,
  templateInterviewInviteNewUser,
} from '@/lib/ops/email-templates';
import { interviewsLoginUrl } from '@/lib/ops/host';
import { findUserIdByEmail } from '@/lib/ops/auth-users';
import { isInterviewPartnerRole, type InterviewPartnerRole } from '@/lib/ops/interview-partner';

export type InterviewInviteResult = {
  userId: string;
  memberId: string;
  partnerId: string;
  isNewUser: boolean;
};

export async function inviteInterviewPartnerCore(opts: {
  email: string;
  fullName: string;
  role: string;
  partnerId?: string | null;
  partnerName?: string | null;
  actorId: string;
  sendEmail?: boolean;
}): Promise<InterviewInviteResult> {
  const email = opts.email.trim().toLowerCase();
  const fullName = opts.fullName.trim().slice(0, 200);
  const role = opts.role.trim();
  if (!email) throw new Error('Email requerido');
  if (fullName.length < 1) throw new Error('Nombre requerido');
  if (!isInterviewPartnerRole(role)) throw new Error('Rol inválido');

  const admin = createAdminClient();
  let partnerId = opts.partnerId?.trim() || '';
  const partnerName = (opts.partnerName || '').trim().slice(0, 200);

  if (partnerId) {
    const { data: partner } = await admin
      .from('ops_recruiting_partners')
      .select('id, name, active')
      .eq('id', partnerId)
      .maybeSingle();
    if (!partner?.id) throw new Error('Organización no encontrada');
    if (!partner.active) throw new Error('Esa organización está inactiva');
  } else {
    if (partnerName.length < 2) throw new Error('Organización requerida');
    const { data: created, error } = await admin
      .from('ops_recruiting_partners')
      .insert({ name: partnerName, created_by: opts.actorId, active: true })
      .select('id')
      .single();
    if (error || !created) throw await throwDb(error);
    partnerId = created.id;
  }

  let userId: string;
  let isNewUser = false;
  let tempPassword: string | undefined;

  const existingId = await findUserIdByEmail(email);
  if (existingId) {
    userId = existingId;
  } else {
    tempPassword = crypto.randomUUID();
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error || !created?.user) throw await throwDb(error);
    userId = created.user.id;
    isNewUser = true;
  }

  const { data: existingMember } = await admin
    .from('ops_recruiting_partner_members')
    .select('id, partner_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMember && existingMember.partner_id !== partnerId) {
    throw new Error('Ese correo ya pertenece a otra organización de entrevistas');
  }

  const { data: member, error: memberError } = await admin
    .from('ops_recruiting_partner_members')
    .upsert(
      {
        ...(existingMember?.id ? { id: existingMember.id } : {}),
        partner_id: partnerId,
        user_id: userId,
        full_name: fullName,
        email,
        role: role as InterviewPartnerRole,
        active: true,
      },
      { onConflict: 'user_id' }
    )
    .select('id')
    .single();

  if (memberError || !member) throw await throwDb(memberError);

  if (opts.sendEmail !== false) {
    const { data: partner } = await admin
      .from('ops_recruiting_partners')
      .select('name')
      .eq('id', partnerId)
      .maybeSingle();
    const orgName = partner?.name || partnerName || 'Codiva';
    const loginUrl = interviewsLoginUrl();
    const html = isNewUser
      ? templateInterviewInviteNewUser(fullName, email, tempPassword!, loginUrl, orgName)
      : templateInterviewInviteExistingUser(fullName, loginUrl, orgName);

    const mail = await sendClientEmail({
      to: email,
      subject: `Acceso a entrevistas Codiva · ${orgName}`,
      html,
    });
    if (!mail.ok && !mail.skipped) {
      console.error('[interview invite mail]', mail.error);
      await throwPublic('auth.sendFailed');
    }
  }

  return { userId, memberId: member.id, partnerId, isNewUser };
}
