import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { chargeAmountNumber } from '@/lib/ops/charges';
import { getAcceptanceStatus, type MemberAcceptanceFields } from '@/lib/ops/legal/acceptances';
import {
  can,
  canAny,
  type Capability,
  type PermissionSubject,
  type StaffRole,
} from '@/lib/ops/permissions';
import { isOpsHost } from '@/lib/ops/host';
import { loadInterviewMemberById, readInterviewViewAsMemberId } from '@/lib/ops/interview-view-as';
import { safeNextPath } from '@/lib/ops/safe-path';

const PROJECT_SELECT =
  'id, name, slug, status, client_visible, organization_id, progress_percent, description, target_delivery_date, portal_show_quote, portal_show_costs, site_preview_url, site_production_url';

const MEMBER_SELECT =
  'id, role, terms_accepted_at, terms_version, privacy_accepted_at, privacy_version, nda_accepted_at, nda_version';

export type StaffAccess = Awaited<ReturnType<typeof requireStaff>>;

function loginUrlWithReturn(loginPath: string, incomingPath: string | null): string {
  const next = safeNextPath(incomingPath, '');
  if (!next) return loginPath;
  return `${loginPath}?next=${encodeURIComponent(next)}`;
}

export const requireStaff = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginUrlWithReturn('/login', (await headers()).get('x-codiva-path')));
  }

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, full_name, role, active, capabilities')
    .eq('id', user.id)
    .eq('active', true)
    .single();

  if (!staff) {
    redirect('/login?error=not_staff');
  }

  return { user, staff, supabase };
});

/** Solo administradores (gestión de equipo). */
export async function requireAdminStaff() {
  return requireCapability('team');
}

/** Admin o PM: ver postulaciones, pruebas y hallazgos de la bolsa. */
export async function requireCareersReview() {
  const access = await requireStaff();
  if (!canAny(access.staff, ['team', 'careers_review'])) {
    redirect('/dashboard?error=forbidden');
  }
  return access;
}

/** Para server actions de revisión de bolsa. */
export async function assertCareersReview() {
  const access = await requireStaff();
  if (!canAny(access.staff, ['team', 'careers_review'])) {
    throw new Error('No tienes permiso para esta acción');
  }
  return access;
}

/** Staff con una capability concreta; si no, redirige a dashboard. */
export async function requireCapability(capability: Capability) {
  const access = await requireStaff();
  if (!can(access.staff, capability)) {
    redirect('/dashboard?error=forbidden');
  }
  return access;
}

/** Para server actions: lanza error en lugar de redirect. */
export async function assertCapability(capability: Capability) {
  const access = await requireStaff();
  if (!can(access.staff, capability)) {
    throw new Error('No tienes permiso para esta acción');
  }
  return access;
}

export function staffRole(access: StaffAccess): StaffRole {
  return access.staff.role as StaffRole;
}

/** IDs de proyectos visibles para el staff (null = todos). */
export async function listVisibleProjectIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  staffId: string,
  subject: PermissionSubject
): Promise<string[] | null> {
  if (can(subject, 'projects_all')) return null;

  const { data } = await supabase
    .from('project_staff')
    .select('project_id')
    .eq('staff_id', staffId);

  return (data ?? []).map((r) => r.project_id);
}

/** Para `.in('id' | 'project_id', ids)`: null = sin filtro; lista vacía = ningún proyecto. */
export function projectIdInFilter(visibleIds: string[] | null): string[] | null {
  if (visibleIds === null) return null;
  return visibleIds.length ? visibleIds : ['00000000-0000-0000-0000-000000000000'];
}

export async function assertProjectAccess(
  access: StaffAccess,
  projectId: string
): Promise<void> {
  if (can(access.staff, 'projects_all')) return;

  const { data } = await access.supabase
    .from('project_staff')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('staff_id', access.user.id)
    .maybeSingle();

  if (!data) {
    redirect('/projects?error=forbidden');
  }
}

/** Para server actions. */
export async function assertProjectAccessOrThrow(
  access: StaffAccess,
  projectId: string
): Promise<void> {
  if (can(access.staff, 'projects_all')) return;

  const { data } = await access.supabase
    .from('project_staff')
    .select('project_id')
    .eq('project_id', projectId)
    .eq('staff_id', access.user.id)
    .maybeSingle();

  if (!data) {
    throw new Error('No tienes acceso a este proyecto');
  }
}

async function getActiveStaff(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, full_name, role, capabilities')
    .eq('id', userId)
    .eq('active', true)
    .maybeSingle();
  return staff;
}

/**
 * Acceso al portal: miembro del proyecto o staff en vista previa.
 * Staff puede ver incluso si client_visible = false.
 */
export async function requirePortalAccess(slug: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginUrlWithReturn(`/p/${slug}/login`, (await headers()).get('x-codiva-path')));
  }

  const staff = await getActiveStaff(supabase, user.id);

  let projectQuery = supabase.from('projects').select(PROJECT_SELECT).eq('slug', slug);
  if (!staff) {
    projectQuery = projectQuery.eq('client_visible', true);
  }

  const { data: project } = await projectQuery.maybeSingle();

  if (!project) {
    redirect(`/p/${slug}/login?error=not_found`);
  }

  if (staff) {
    return {
      user,
      project,
      membership: null as null,
      isStaffPreview: true as const,
      supabase,
      staff,
    };
  }

  const { data: membership } = await supabase
    .from('project_members')
    .select(MEMBER_SELECT)
    .eq('project_id', project.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    redirect(`/p/${slug}/login?error=no_access`);
  }

  return {
    user,
    project,
    membership: membership as MemberAcceptanceFields & { id: string; role: string },
    isStaffPreview: false as const,
    supabase,
    staff: null,
  };
}

/** @deprecated prefer requirePortalAccess - mantiene compatibilidad */
export async function requireProjectMember(slug: string) {
  const access = await requirePortalAccess(slug);
  if (access.isStaffPreview) {
    return {
      user: access.user,
      project: access.project,
      membership: { id: 'staff-preview', role: 'viewer' as const },
      supabase: access.supabase,
      isStaffPreview: true as const,
    };
  }
  return {
    user: access.user,
    project: access.project,
    membership: access.membership,
    supabase: access.supabase,
    isStaffPreview: false as const,
  };
}

export async function requirePortalMemberWithAcceptances(slug: string) {
  const access = await requirePortalAccess(slug);

  if (access.isStaffPreview) {
    return access;
  }

  const status = getAcceptanceStatus(access.membership);
  if (!status.complete) {
    redirect(`/p/${slug}/aceptar`);
  }

  return access;
}

export async function getStaffIfAny() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const staff = await getActiveStaff(supabase, user.id);
  return staff ? { user, staff, supabase } : null;
}

export type PortalProjectSummary = {
  id: string;
  name: string;
  slug: string;
  status: string;
  progress_percent: number;
  description: string | null;
  portal_show_costs: boolean;
};

export type PortalProjectHubCard = PortalProjectSummary & {
  pendingAmount: number | null;
  pendingCurrency: string;
  nextMilestone: { title: string; due_date: string | null; status: string } | null;
};

/**
 * Sesión de cliente en el hub del portal (no staff).
 * Staff autenticado en portal.* no tiene cookie compartida con ops; si llega aquí, se trata como usuario normal.
 */
export async function requirePortalUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(loginUrlWithReturn('/login', (await headers()).get('x-codiva-path')));
  }

  return { user, supabase };
}

/** Proyectos client_visible donde el usuario es miembro. */
export async function listPortalProjectsForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<PortalProjectSummary[]> {
  const { data: rows } = await supabase
    .from('project_members')
    .select(
      'projects!inner(id, name, slug, status, progress_percent, description, client_visible, portal_show_costs)'
    )
    .eq('user_id', userId);

  const projects: PortalProjectSummary[] = [];
  for (const row of rows ?? []) {
    const raw = row.projects as
      | (PortalProjectSummary & { client_visible: boolean })
      | (PortalProjectSummary & { client_visible: boolean })[]
      | null;
    const p = Array.isArray(raw) ? raw[0] : raw;
    if (!p || p.client_visible === false) continue;
    projects.push({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      progress_percent: p.progress_percent,
      description: p.description ?? null,
      portal_show_costs: Boolean(p.portal_show_costs),
    });
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Resume adeudo pendiente y próximo hito para el hub “Mis proyectos”. */
export async function enrichPortalProjectHubCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projects: PortalProjectSummary[]
): Promise<PortalProjectHubCard[]> {
  if (projects.length === 0) return [];

  const ids = projects.map((p) => p.id);
  const costIds = projects.filter((p) => p.portal_show_costs).map((p) => p.id);

  const [{ data: milestones }, { data: charges }] = await Promise.all([
    supabase
      .from('milestones')
      .select('project_id, title, status, due_date, sort_order')
      .in('project_id', ids)
      .eq('visible_to_client', true)
      .order('sort_order', { ascending: true }),
    costIds.length
      ? supabase
          .from('project_charges')
          .select('project_id, amount, currency, status')
          .in('project_id', costIds)
          .eq('visible_to_client', true)
          .in('status', ['pending', 'overdue'])
      : Promise.resolve({
          data: [] as {
            project_id: string;
            amount: number | string | null;
            currency: string;
            status: string;
          }[],
        }),
  ]);

  const nextByProject = new Map<string, { title: string; due_date: string | null; status: string }>();
  for (const m of milestones ?? []) {
    if (m.status === 'completed') continue;
    if (nextByProject.has(m.project_id)) continue;
    nextByProject.set(m.project_id, {
      title: m.title,
      due_date: m.due_date,
      status: m.status,
    });
  }

  const pendingByProject = new Map<string, { amount: number; currency: string }>();
  for (const c of charges ?? []) {
    const n = chargeAmountNumber(c.amount);
    if (n == null) continue;
    const prev = pendingByProject.get(c.project_id);
    if (!prev) {
      pendingByProject.set(c.project_id, { amount: n, currency: c.currency || 'MXN' });
    } else {
      pendingByProject.set(c.project_id, {
        amount: prev.amount + n,
        currency: prev.currency || c.currency || 'MXN',
      });
    }
  }

  return projects.map((p) => {
    const pending = pendingByProject.get(p.id);
    return {
      ...p,
      pendingAmount: p.portal_show_costs ? (pending?.amount ?? 0) : null,
      pendingCurrency: pending?.currency ?? 'MXN',
      nextMilestone: nextByProject.get(p.id) ?? null,
    };
  });
}

export type InterviewPartnerMember = MemberAcceptanceFields & {
  id: string;
  partner_id: string;
  user_id: string;
  full_name: string;
  role: string;
  active: boolean;
};

export type InterviewPartnerOrg = {
  id: string;
  name: string;
  active: boolean;
};

const INTERVIEW_MEMBER_SELECT =
  'id, partner_id, user_id, full_name, role, active, terms_accepted_at, terms_version, privacy_accepted_at, privacy_version, nda_accepted_at, nda_version';

export async function loadActiveInterviewMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data: member } = await supabase
    .from('ops_recruiting_partner_members')
    .select(`${INTERVIEW_MEMBER_SELECT}, ops_recruiting_partners!inner(id, name, active)`)
    .eq('user_id', userId)
    .eq('active', true)
    .eq('ops_recruiting_partners.active', true)
    .maybeSingle();

  if (!member) return null;
  const raw = member.ops_recruiting_partners as InterviewPartnerOrg | InterviewPartnerOrg[] | null;
  const partner = Array.isArray(raw) ? raw[0] : raw;
  if (!partner?.active) return null;
  const { ops_recruiting_partners: _ignored, ...rest } = member as typeof member & {
    ops_recruiting_partners: unknown;
  };
  return { member: rest as InterviewPartnerMember, partner };
}

/**
 * Host interviews: miembro activo. Host ops: staff con careers_review (vista previa).
 */
export async function requireInterviewsAccess() {
  const supabase = await createClient();
  const host = (await headers()).get('x-codiva-host') || (await headers()).get('host');
  const incomingPath = (await headers()).get('x-codiva-path');
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isOpsHost(host)) {
    if (!user) {
      redirect(loginUrlWithReturn('/login', incomingPath));
    }
    const staff = await getActiveStaff(supabase, user.id);
    if (!staff || !canAny(staff, ['team', 'careers_review'])) {
      redirect('/dashboard?error=forbidden');
    }
    const viewAsId = await readInterviewViewAsMemberId();
    const viewed = viewAsId ? await loadInterviewMemberById(viewAsId) : null;
    return {
      user,
      supabase,
      staff,
      member: viewed?.member ?? (null as InterviewPartnerMember | null),
      partner: viewed?.partner ?? (null as InterviewPartnerOrg | null),
      isStaffPreview: true as const,
    };
  }

  if (!user) {
    redirect(loginUrlWithReturn('/login', incomingPath));
  }

  const loaded = await loadActiveInterviewMember(supabase, user.id);
  if (!loaded) {
    redirect('/login?error=no_access');
  }

  return {
    user,
    supabase,
    staff: null,
    member: loaded.member,
    partner: loaded.partner,
    isStaffPreview: false as const,
  };
}

export async function requireInterviewPartner() {
  const access = await requireInterviewsAccess();
  if (access.isStaffPreview || !access.member) {
    throw new Error('Esta acción es para el portal de entrevistas');
  }
  return access;
}

export async function requireInterviewPartnerWithAcceptances() {
  const access = await requireInterviewPartner();
  const status = getAcceptanceStatus(access.member);
  if (!status.complete) {
    redirect('/aceptar');
  }
  return access;
}

