-- SaaS instance licenses (NIRC). Staff-only. No prices here; charges stay on project_charges.

CREATE TABLE IF NOT EXISTS public.saas_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES public.projects(id) ON DELETE CASCADE,
  instance_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'grace', 'locked')),
  period_start date,
  period_end date,
  grace_until date,
  modules text[] NOT NULL DEFAULT ARRAY['cincel', 'idse', 'stp']::text[],
  entitlement_token text,
  instance_push_url text,
  notes text NOT NULL DEFAULT '',
  last_pushed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saas_usage_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.saas_instances(id) ON DELETE CASCADE,
  period_label text NOT NULL,
  meter text NOT NULL CHECK (meter IN ('contract_signed', 'imss_alta', 'payout', 'c_doc')),
  quantity integer NOT NULL DEFAULT 0,
  UNIQUE (instance_id, period_label, meter)
);

CREATE TABLE IF NOT EXISTS public.saas_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.saas_instances(id) ON DELETE CASCADE,
  meter text NOT NULL CHECK (meter IN ('contract_signed', 'imss_alta', 'payout', 'c_doc')),
  aggregate_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instance_id, meter, aggregate_id)
);

CREATE TABLE IF NOT EXISTS public.saas_vendor_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid NOT NULL REFERENCES public.saas_instances(id) ON DELETE CASCADE,
  slot text NOT NULL CHECK (slot IN ('cincel', 'idse', 'stp')),
  expires_at timestamptz,
  last_error text,
  last_checked_at timestamptz,
  notes text NOT NULL DEFAULT '',
  UNIQUE (instance_id, slot)
);

CREATE INDEX IF NOT EXISTS saas_instances_status_idx ON public.saas_instances (status);
CREATE INDEX IF NOT EXISTS saas_vendor_slots_exp_idx ON public.saas_vendor_slots (expires_at);

COMMENT ON TABLE public.saas_instances IS
  'Codiva control plane for a NIRC SaaS instance. Product FSM stays in the NIRC repo.';

ALTER TABLE public.saas_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_vendor_slots ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.saas_instances FROM anon;
REVOKE ALL ON TABLE public.saas_instances FROM authenticated;
REVOKE ALL ON TABLE public.saas_usage_counters FROM anon;
REVOKE ALL ON TABLE public.saas_usage_counters FROM authenticated;
REVOKE ALL ON TABLE public.saas_usage_events FROM anon;
REVOKE ALL ON TABLE public.saas_usage_events FROM authenticated;
REVOKE ALL ON TABLE public.saas_vendor_slots FROM anon;
REVOKE ALL ON TABLE public.saas_vendor_slots FROM authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saas_instances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saas_instances TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saas_usage_counters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saas_usage_counters TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saas_usage_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saas_usage_events TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saas_vendor_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saas_vendor_slots TO service_role;

DROP POLICY IF EXISTS staff_all_saas_instances ON public.saas_instances;
CREATE POLICY staff_all_saas_instances ON public.saas_instances
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_all_saas_usage_counters ON public.saas_usage_counters;
CREATE POLICY staff_all_saas_usage_counters ON public.saas_usage_counters
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_all_saas_usage_events ON public.saas_usage_events;
CREATE POLICY staff_all_saas_usage_events ON public.saas_usage_events
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS staff_all_saas_vendor_slots ON public.saas_vendor_slots;
CREATE POLICY staff_all_saas_vendor_slots ON public.saas_vendor_slots
  FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());
