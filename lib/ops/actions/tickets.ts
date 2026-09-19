'use server';

import { revalidatePath } from 'next/cache';
import { assertCapability } from '@/lib/ops/auth';
import { logActivity } from '@/lib/ops/activity';
import { throwDb } from '@/lib/ops/throw-db';

export async function updateTicketStatus(ticketId: string, status: string) {
  const { supabase, user } = await assertCapability('tickets');
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
  const { supabase, user } = await assertCapability('tickets');
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
