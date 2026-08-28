-- Pedidos de edición de subtareas cuando el asignado no administra el tablero.

CREATE TABLE public.work_assignment_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.work_assignments(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  payload text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  CONSTRAINT work_assignment_edit_requests_payload_chk CHECK (char_length(payload) <= 8000),
  CONSTRAINT work_assignment_edit_requests_status_chk CHECK (status IN ('open', 'applied', 'dismissed'))
);

CREATE UNIQUE INDEX idx_work_assignment_edit_requests_open
  ON public.work_assignment_edit_requests (assignment_id)
  WHERE status = 'open';

CREATE INDEX idx_work_assignment_edit_requests_status
  ON public.work_assignment_edit_requests (status, created_at DESC);

ALTER TABLE public.work_assignment_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_all_work_assignment_edit_requests ON public.work_assignment_edit_requests FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());
