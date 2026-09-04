-- Vacante dueña del proceso de entrevistas y del alta; comentarios de entrevista editables/borrables.

ALTER TABLE public.ops_job_postings
  ADD COLUMN IF NOT EXISTS interview_plan text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hire_monthly_compensation numeric(12, 2),
  ADD COLUMN IF NOT EXISTS hire_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS hire_work_modality public.personnel_work_modality NOT NULL DEFAULT 'remote';

ALTER TABLE public.ops_job_postings
  DROP CONSTRAINT IF EXISTS ops_job_postings_interview_plan_ck,
  DROP CONSTRAINT IF EXISTS ops_job_postings_hire_currency_ck,
  DROP CONSTRAINT IF EXISTS ops_job_postings_hire_compensation_ck;

ALTER TABLE public.ops_job_postings
  ADD CONSTRAINT ops_job_postings_interview_plan_ck
    CHECK (interview_plan <@ ARRAY['screening', 'technical', 'culture', 'final', 'other']::text[]),
  ADD CONSTRAINT ops_job_postings_hire_currency_ck
    CHECK (char_length(trim(hire_currency)) BETWEEN 3 AND 8),
  ADD CONSTRAINT ops_job_postings_hire_compensation_ck
    CHECK (hire_monthly_compensation IS NULL OR hire_monthly_compensation > 0);

COMMENT ON COLUMN public.ops_job_postings.interview_plan IS
  'Fases que se crean al pasar una postulación a Entrevista. Vacío: no se siembra nada.';
COMMENT ON COLUMN public.ops_job_postings.hire_monthly_compensation IS
  'Compensación mensual sugerida al convertir la postulación en carta oferta.';
COMMENT ON COLUMN public.ops_job_postings.hire_currency IS
  'Moneda de la compensación sugerida al contratar.';
COMMENT ON COLUMN public.ops_job_postings.hire_work_modality IS
  'Modalidad de trabajo sugerida al contratar.';

DROP POLICY IF EXISTS admin_update_ops_job_interview_comments ON public.ops_job_interview_comments;
DROP POLICY IF EXISTS admin_delete_ops_job_interview_comments ON public.ops_job_interview_comments;
DROP POLICY IF EXISTS careers_review_update_ops_job_interview_comments ON public.ops_job_interview_comments;
DROP POLICY IF EXISTS careers_review_delete_ops_job_interview_comments ON public.ops_job_interview_comments;

CREATE POLICY admin_update_ops_job_interview_comments ON public.ops_job_interview_comments FOR UPDATE
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

CREATE POLICY admin_delete_ops_job_interview_comments ON public.ops_job_interview_comments FOR DELETE
  USING (public.is_admin_staff());

CREATE POLICY careers_review_update_ops_job_interview_comments ON public.ops_job_interview_comments FOR UPDATE
  USING (public.is_careers_review_staff())
  WITH CHECK (public.is_careers_review_staff());

CREATE POLICY careers_review_delete_ops_job_interview_comments ON public.ops_job_interview_comments FOR DELETE
  USING (public.is_careers_review_staff());

COMMENT ON TABLE public.ops_job_interview_comments IS
  'Notas del entrevistador o de quien gestiona el equipo; se pueden editar y borrar.';
