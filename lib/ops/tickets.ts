import { createAdminClient } from '@/lib/supabase/admin';

export type TicketProjectContext = {
  projectId: string | null;
  organizationId: string | null;
  projectName: string | null;
};

function exactIlike(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function asProject(
  value: unknown
): { id?: string; name?: string; organization_id?: string | null } | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as ReturnType<typeof asProject>) ?? null;
  return value as { id?: string; name?: string; organization_id?: string | null };
}

/** `projectId` must already be authorized by the caller (portal membership or staff project access). */
export async function resolveTicketProject({
  projectId,
  email,
}: {
  projectId?: string | null;
  email: string;
}): Promise<TicketProjectContext> {
  const admin = createAdminClient();
  const empty: TicketProjectContext = { projectId: null, organizationId: null, projectName: null };

  if (projectId) {
    const { data } = await admin
      .from('projects')
      .select('id, name, organization_id')
      .eq('id', projectId)
      .maybeSingle();
    if (data) {
      return {
        projectId: data.id,
        organizationId: data.organization_id ?? null,
        projectName: data.name ?? null,
      };
    }
  }

  const normalized = email.toLowerCase().trim();
  if (!normalized) return empty;

  const { data: prevTicket } = await admin
    .from('tickets')
    .select('project_id, organization_id, projects(id, name, organization_id)')
    .ilike('reporter_email', exactIlike(normalized))
    .not('project_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevTicket?.project_id) {
    const project = asProject(prevTicket.projects);
    return {
      projectId: prevTicket.project_id,
      organizationId: prevTicket.organization_id ?? project?.organization_id ?? null,
      projectName: project?.name ?? null,
    };
  }

  const { data: lead } = await admin
    .from('leads')
    .select('converted_project_id')
    .ilike('email', exactIlike(normalized))
    .not('converted_project_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lead?.converted_project_id) {
    const { data: project } = await admin
      .from('projects')
      .select('id, name, organization_id')
      .eq('id', lead.converted_project_id)
      .maybeSingle();
    return {
      projectId: lead.converted_project_id,
      organizationId: project?.organization_id ?? null,
      projectName: project?.name ?? null,
    };
  }

  return empty;
}
