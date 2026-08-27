-- Menciones leídas para la bandeja de pendientes.

ALTER TABLE public.work_assignment_mentions
  ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_work_assignment_mentions_unread
  ON public.work_assignment_mentions (mentioned_staff_id, created_at DESC)
  WHERE read_at IS NULL;
