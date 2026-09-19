-- Calendario Ops: agenda de entrevistas (scheduled_at ya existía) + eventos internos.

ALTER TABLE public.ops_job_interview_rounds
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz;

ALTER TABLE public.ops_job_interview_rounds
  DROP CONSTRAINT IF EXISTS ops_job_interview_rounds_duration_ck;
ALTER TABLE public.ops_job_interview_rounds
  ADD CONSTRAINT ops_job_interview_rounds_duration_ck
  CHECK (duration_minutes BETWEEN 15 AND 480);

ALTER TABLE public.ops_job_interview_rounds
  DROP CONSTRAINT IF EXISTS ops_job_interview_rounds_location_len_ck;
ALTER TABLE public.ops_job_interview_rounds
  ADD CONSTRAINT ops_job_interview_rounds_location_len_ck
  CHECK (location IS NULL OR char_length(trim(location)) BETWEEN 1 AND 200);

ALTER TABLE public.ops_job_interview_rounds
  DROP CONSTRAINT IF EXISTS ops_job_interview_rounds_meeting_url_len_ck;
ALTER TABLE public.ops_job_interview_rounds
  ADD CONSTRAINT ops_job_interview_rounds_meeting_url_len_ck
  CHECK (meeting_url IS NULL OR char_length(trim(meeting_url)) BETWEEN 1 AND 500);

CREATE INDEX IF NOT EXISTS idx_ops_job_interview_rounds_scheduled
  ON public.ops_job_interview_rounds (scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status = 'planned';

CREATE TABLE public.ops_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'internal',
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  location text,
  meeting_url text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  reminder_24h_sent_at timestamptz,
  reminder_1h_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_calendar_events_kind_ck
    CHECK (kind = ANY (ARRAY['internal'::text, 'client'::text, 'release_qa'::text, 'quote_followup'::text, 'other'::text])),
  CONSTRAINT ops_calendar_events_title_len_ck
    CHECK (char_length(trim(title)) BETWEEN 1 AND 160),
  CONSTRAINT ops_calendar_events_duration_ck
    CHECK (duration_minutes BETWEEN 15 AND 480),
  CONSTRAINT ops_calendar_events_location_len_ck
    CHECK (location IS NULL OR char_length(trim(location)) BETWEEN 1 AND 200),
  CONSTRAINT ops_calendar_events_meeting_url_len_ck
    CHECK (meeting_url IS NULL OR char_length(trim(meeting_url)) BETWEEN 1 AND 500)
);

CREATE INDEX idx_ops_calendar_events_starts
  ON public.ops_calendar_events (starts_at);

CREATE TRIGGER ops_calendar_events_updated_at
  BEFORE UPDATE ON public.ops_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.ops_calendar_events IS
  'Eventos internos de Ops (junta, QA de release, follow-up de cotización). Las entrevistas viven en ops_job_interview_rounds.scheduled_at.';

ALTER TABLE public.ops_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_all_ops_calendar_events ON public.ops_calendar_events FOR ALL
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ops_calendar_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ops_calendar_events TO service_role;
