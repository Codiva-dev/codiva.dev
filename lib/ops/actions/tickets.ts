'use server';

import { revalidatePath } from 'next/cache';
import { assertCapability, assertProjectAccessOrThrow, withAdminClient } from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import { throwDb } from '@/lib/ops/throw-db';
import { createAdminClient } from '@/lib/supabase/admin';

async function loadTicketForStaff(ticketId: string) {
  const access = await assertCapability('tickets');
  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from('tickets')
    .select('id, project_id')
    .eq('id', ticketId)
    .maybeSingle();
  if (error) throw await throwDb(error);
  if (!ticket) throw new Error('Ticket no encontrado');
  if (ticket.project_id) await assertProjectAccessOrThrow(access, ticket.project_id);
  return withAdminClient(access);
}

export async function updateTicketStatus(ticketId: string, status: string) {
  const { supabase, user } = await loadTicketForStaff(ticketId);
  const { error } = await supabase.from('tickets').update({ status }).eq('id', ticketId);
  if (error) throw await throwDb(error);
  await logActivity({
    entityType: 'ticket',
    entityId: ticketId,
    action: 'status_updated',
    metadata: { status },
    actorId: user.id,
  });
  revalidatePath('/tickets');
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath('/inbox');
  revalidatePath('/pendientes');
}

export async function updateTicketAssignment(ticketId: string, formData: FormData) {
  const { supabase, user } = await loadTicketForStaff(ticketId);
  const status = String(formData.get('status') || '').trim();
  const assignedTo = String(formData.get('assignedTo') || '').trim() || null;

  if (!['new', 'in_progress', 'waiting_client', 'resolved', 'closed'].includes(status)) {
    throw new Error('Estado inválido');
  }

  const { error } = await supabase
    .from('tickets')
    .update({ status, assigned_to: assignedTo })
    .eq('id', ticketId);
  if (error) throw await throwDb(error);

  await logActivity({
    entityType: 'ticket',
    entityId: ticketId,
    action: 'updated',
    metadata: { status, assigned_to: assignedTo },
    actorId: user.id,
  });
  revalidatePath('/tickets');
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath('/workload');
  revalidatePath('/inbox');
  revalidatePath('/pendientes');
}
