-- Web Push staff, cola de atención y Realtime del tablero.

CREATE TABLE public.ops_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_push_subscriptions_endpoint_len_ck
    CHECK (char_length(trim(endpoint)) BETWEEN 20 AND 2000),
  CONSTRAINT ops_push_subscriptions_p256dh_len_ck
    CHECK (char_length(trim(p256dh)) BETWEEN 20 AND 200),
  CONSTRAINT ops_push_subscriptions_auth_len_ck
    CHECK (char_length(trim(auth)) BETWEEN 8 AND 200),
  CONSTRAINT ops_push_subscriptions_endpoint_key UNIQUE (endpoint)
);

CREATE INDEX idx_ops_push_subscriptions_staff
  ON public.ops_push_subscriptions (staff_id);

CREATE TRIGGER ops_push_subscriptions_updated_at
  BEFORE UPDATE ON public.ops_push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ops_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_own_ops_push_subscriptions ON public.ops_push_subscriptions FOR ALL
  USING (public.is_staff() AND staff_id = auth.uid())
  WITH CHECK (public.is_staff() AND staff_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ops_push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ops_push_subscriptions TO service_role;

CREATE TABLE public.ops_attention_snoozes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ops_attention_snoozes_key_len_ck
    CHECK (char_length(trim(item_key)) BETWEEN 3 AND 120),
  CONSTRAINT ops_attention_snoozes_staff_key UNIQUE (staff_id, item_key)
);

CREATE INDEX idx_ops_attention_snoozes_until
  ON public.ops_attention_snoozes (staff_id, until);

ALTER TABLE public.ops_attention_snoozes ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_own_ops_attention_snoozes ON public.ops_attention_snoozes FOR ALL
  USING (public.is_staff() AND staff_id = auth.uid())
  WITH CHECK (public.is_staff() AND staff_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ops_attention_snoozes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ops_attention_snoozes TO service_role;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'work_assignments',
    'work_assignment_subtasks',
    'work_assignment_comments',
    'work_assignment_mentions'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.work_assignments REPLICA IDENTITY FULL;
ALTER TABLE public.work_assignment_subtasks REPLICA IDENTITY FULL;
ALTER TABLE public.work_assignment_comments REPLICA IDENTITY FULL;
ALTER TABLE public.work_assignment_mentions REPLICA IDENTITY FULL;
