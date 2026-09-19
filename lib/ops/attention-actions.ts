'use server';

import { revalidatePath } from 'next/cache';
import { requireStaff } from '@/lib/ops/auth';
import { ATTENTION_KINDS, snoozeUntilIso } from '@/lib/ops/attention';
import { isUuid } from '@/lib/ops/project-path';
import { throwDb } from '@/lib/ops/throw-db';

const KEY_RE = new RegExp(`^(${ATTENTION_KINDS.join('|')}):([0-9a-f-]{36})$`, 'i');

export async function snoozeAttentionItem(formData: FormData) {
  const { supabase, staff } = await requireStaff();
  const key = String(formData.get('item_key') || '').trim();
  const match = KEY_RE.exec(key);
  if (!match || !isUuid(match[2])) throw new Error('Ítem inválido');

  const until = snoozeUntilIso();
  const { error } = await supabase.from('ops_attention_snoozes').upsert(
    {
      staff_id: staff.id,
      item_key: key,
      until,
    },
    { onConflict: 'staff_id,item_key' }
  );
  if (error) throw await throwDb(error);
  revalidatePath('/pendientes');
}
