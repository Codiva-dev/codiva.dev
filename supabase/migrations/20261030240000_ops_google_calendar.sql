-- Google Calendar por staff: enlace OAuth + mapeo de eventos sincronizados.

CREATE TABLE public.ops_google_calendar_links (
  staff_id uuid PRIMARY KEY REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  google_sub text NOT NULL,
  google_email text NOT NULL,
  refresh_token text NOT NULL,
  access_token text,
  access_token_expires_at timestamptz,
  calendar_id text NOT NULL DEFAULT 'primary',
  scopes text[] NOT NULL DEFAULT '{}'::text[],
  linked_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  CONSTRAINT ops_google_calendar_links_sub_key UNIQUE (google_sub),
  CONSTRAINT ops_google_calendar_links_email_len_ck
    CHECK (char_length(trim(google_email)) BETWEEN 3 AND 320),
  CONSTRAINT ops_google_calendar_links_calendar_id_len_ck
    CHECK (char_length(trim(calendar_id)) BETWEEN 1 AND 200),
  CONSTRAINT ops_google_calendar_links_refresh_len_ck
    CHECK (char_length(trim(refresh_token)) BETWEEN 20 AND 2000)
);

CREATE TRIGGER ops_google_calendar_links_updated_at
  BEFORE UPDATE ON public.ops_google_calendar_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.ops_google_calendar_links IS
  'OAuth Google Calendar por staff. refresh_token solo se lee en server con service_role o SELECT propio; no enviar al cliente.';

ALTER TABLE public.ops_google_calendar_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_own_ops_google_calendar_links ON public.ops_google_calendar_links FOR ALL
  USING (public.is_staff() AND staff_id = auth.uid())
  WITH CHECK (public.is_staff() AND staff_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ops_google_calendar_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ops_google_calendar_links TO service_role;

CREATE TABLE public.ops_google_calendar_sync (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  source_kind text NOT NULL,
  source_id uuid NOT NULL,
  google_event_id text NOT NULL,
  google_calendar_id text NOT NULL DEFAULT 'primary',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_google_calendar_sync_kind_ck
    CHECK (source_kind = ANY (ARRAY['event'::text, 'interview'::text])),
  CONSTRAINT ops_google_calendar_sync_event_id_len_ck
    CHECK (char_length(trim(google_event_id)) BETWEEN 1 AND 200),
  CONSTRAINT ops_google_calendar_sync_calendar_id_len_ck
    CHECK (char_length(trim(google_calendar_id)) BETWEEN 1 AND 200),
  CONSTRAINT ops_google_calendar_sync_staff_source_key UNIQUE (staff_id, source_kind, source_id)
);

CREATE INDEX idx_ops_google_calendar_sync_source
  ON public.ops_google_calendar_sync (source_kind, source_id);

CREATE TRIGGER ops_google_calendar_sync_updated_at
  BEFORE UPDATE ON public.ops_google_calendar_sync
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.ops_google_calendar_sync IS
  'Mapeo ops_calendar_events / ops_job_interview_rounds → Google Calendar event id por staff.';

ALTER TABLE public.ops_google_calendar_sync ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_own_ops_google_calendar_sync ON public.ops_google_calendar_sync FOR ALL
  USING (public.is_staff() AND staff_id = auth.uid())
  WITH CHECK (public.is_staff() AND staff_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ops_google_calendar_sync TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ops_google_calendar_sync TO service_role;
