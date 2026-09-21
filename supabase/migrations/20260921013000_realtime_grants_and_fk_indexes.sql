-- Realtime replication evaluates RLS helpers as supabase_realtime_admin.
-- Without EXECUTE, publications fail with "permission denied for function is_staff".
-- Also cover unindexed FKs on calendar / work board / SaaS (advisor + timeouts).

DO $$
DECLARE
  r text;
  fn text;
BEGIN
  FOREACH r IN ARRAY ARRAY[
    'supabase_realtime_admin',
    'supabase_replication_admin',
    'authenticator',
    'supabase_admin'
  ]
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      CONTINUE;
    END IF;

    FOREACH fn IN ARRAY ARRAY[
      'public.is_staff()',
      'public.is_admin_staff()',
      'public.is_careers_review_staff()',
      'public.interview_partner_member_id()',
      'public.client_project_ids()',
      'public.client_organization_ids()',
      'public.is_project_member(uuid)',
      'public.is_organization_client(uuid)',
      'public.staff_has_capability(text)',
      'public.staff_can_access_project(uuid)',
      'public.interview_partner_can_read_application(uuid)',
      'public.interview_partner_can_write_round(uuid)'
    ]
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %I', fn, r);
    END LOOP;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM anon;

DROP POLICY IF EXISTS staff_all_ops_calendar_events ON public.ops_calendar_events;
CREATE POLICY staff_all_ops_calendar_events ON public.ops_calendar_events FOR ALL
  USING ((SELECT public.is_staff()))
  WITH CHECK ((SELECT public.is_staff()));

DROP POLICY IF EXISTS staff_own_ops_push_subscriptions ON public.ops_push_subscriptions;
CREATE POLICY staff_own_ops_push_subscriptions ON public.ops_push_subscriptions FOR ALL
  USING ((SELECT public.is_staff()) AND staff_id = (SELECT auth.uid()))
  WITH CHECK ((SELECT public.is_staff()) AND staff_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS staff_own_ops_attention_snoozes ON public.ops_attention_snoozes;
CREATE POLICY staff_own_ops_attention_snoozes ON public.ops_attention_snoozes FOR ALL
  USING ((SELECT public.is_staff()) AND staff_id = (SELECT auth.uid()))
  WITH CHECK ((SELECT public.is_staff()) AND staff_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS ops_calendar_events_assignee_id_idx
  ON public.ops_calendar_events (assignee_id);
CREATE INDEX IF NOT EXISTS ops_calendar_events_created_by_idx
  ON public.ops_calendar_events (created_by);
CREATE INDEX IF NOT EXISTS ops_calendar_events_project_id_idx
  ON public.ops_calendar_events (project_id);

CREATE INDEX IF NOT EXISTS work_assignments_created_by_idx
  ON public.work_assignments (created_by);
CREATE INDEX IF NOT EXISTS work_assignment_comments_author_id_idx
  ON public.work_assignment_comments (author_id);
CREATE INDEX IF NOT EXISTS work_assignment_files_uploaded_by_idx
  ON public.work_assignment_files (uploaded_by);
CREATE INDEX IF NOT EXISTS work_assignment_mentions_assignment_id_idx
  ON public.work_assignment_mentions (assignment_id);
CREATE INDEX IF NOT EXISTS work_assignment_stage_events_actor_id_idx
  ON public.work_assignment_stage_events (actor_id);

CREATE INDEX IF NOT EXISTS saas_instances_project_id_idx
  ON public.saas_instances (project_id);
CREATE INDEX IF NOT EXISTS saas_usage_counters_instance_id_idx
  ON public.saas_usage_counters (instance_id);
CREATE INDEX IF NOT EXISTS saas_usage_events_instance_id_idx
  ON public.saas_usage_events (instance_id);
CREATE INDEX IF NOT EXISTS saas_vendor_slots_instance_id_idx
  ON public.saas_vendor_slots (instance_id);

CREATE INDEX IF NOT EXISTS project_members_project_id_idx
  ON public.project_members (project_id);
CREATE INDEX IF NOT EXISTS project_staff_project_id_idx
  ON public.project_staff (project_id);
CREATE INDEX IF NOT EXISTS quotes_project_id_idx
  ON public.quotes (project_id);
