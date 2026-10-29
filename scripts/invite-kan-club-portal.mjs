/**
 * One-shot: invite Luis Vaca to portal project kan-club as approver.
 *
 * Requires env (production Codiva):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY (optional; invite still creates membership)
 *
 * Run from repo root:
 *   node --env-file=.env.local scripts/invite-kan-club-portal.mjs
 * or with Vercel env pulled into the shell.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';

const PROJECT_ID = 'b0000001-0001-4000-8000-00000000000d';
const EMAIL = 'luis.vacavelez@gmail.com';
const ROLE = 'approver';
const PORTAL_LOGIN = 'https://portal.codiva.dev/login';
const RESET_PATH = '/p/kan-club/reset-password';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserIdByEmail(email) {
  const target = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email || '').toLowerCase() === target);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id, slug, name, client_visible')
    .eq('id', PROJECT_ID)
    .single();
  if (projectError || !project) throw projectError || new Error('Project not found');

  let userId = await findUserIdByEmail(EMAIL);
  let isNew = false;
  let activateUrl = PORTAL_LOGIN;

  if (!userId) {
    const tempPassword = randomUUID();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: tempPassword,
      email_confirm: true,
    });
    if (error || !created?.user) throw error || new Error('createUser failed');
    userId = created.user.id;
    isNew = true;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: EMAIL,
      options: {
        redirectTo: `https://portal.codiva.dev/auth/callback?next=${encodeURIComponent(RESET_PATH)}`,
      },
    });
    if (linkError) {
      console.warn('generateLink failed; membership created; user can use forgot-password', linkError.message);
    } else {
      activateUrl = linkData.properties?.action_link || activateUrl;
    }
  }

  const { data: existing } = await admin
    .from('project_members')
    .select('id')
    .eq('project_id', PROJECT_ID)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existing) {
    const { error: memberError } = await admin.from('project_members').insert({
      project_id: PROJECT_ID,
      user_id: userId,
      role: ROLE,
      accepted_at: new Date().toISOString(),
    });
    if (memberError) throw memberError;
  }

  if (!project.client_visible) {
    await admin.from('projects').update({ client_visible: true }).eq('id', PROJECT_ID);
  }

  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'hello@codiva.dev';
  if (resendKey) {
    const subject = `Acceso a tu portal - ${project.name}`;
    const html = isNew
      ? `<p>Hola Luis,</p><p>Te damos acceso al portal de <strong>${project.name}</strong>.</p><p><a href="${activateUrl}">Activar acceso / definir contraseña</a></p><p>O entra en <a href="${PORTAL_LOGIN}">${PORTAL_LOGIN}</a>.</p><p>— Codiva</p>`
      : `<p>Hola Luis,</p><p>Ya tienes acceso a <strong>${project.name}</strong>.</p><p><a href="${PORTAL_LOGIN}">Entrar al portal</a></p><p>— Codiva</p>`;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: EMAIL, subject, html }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error('Resend failed', body);
      process.exit(1);
    }
    console.log('Invite email sent', body.id || body);
  } else {
    console.warn('No RESEND_API_KEY — membership created without email');
  }

  console.log(
    JSON.stringify(
      {
        userId,
        isNew,
        projectId: PROJECT_ID,
        slug: project.slug,
        fingerprint: createHash('sha256').update(userId).digest('hex').slice(0, 8),
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
