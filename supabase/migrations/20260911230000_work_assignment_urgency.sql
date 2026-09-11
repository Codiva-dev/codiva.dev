-- Urgencia por asignación para priorizar el Kanban.

ALTER TABLE public.work_assignments
  ADD COLUMN IF NOT EXISTS urgency text NOT NULL DEFAULT 'normal';

ALTER TABLE public.work_assignments
  DROP CONSTRAINT IF EXISTS work_assignments_urgency_chk;

ALTER TABLE public.work_assignments
  ADD CONSTRAINT work_assignments_urgency_chk CHECK (
    urgency IN ('critical', 'high', 'normal', 'low')
  );

CREATE INDEX IF NOT EXISTS idx_work_assignments_urgency
  ON public.work_assignments (urgency, status);
