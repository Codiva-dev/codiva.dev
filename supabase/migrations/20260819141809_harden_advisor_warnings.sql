-- Harden Splinter advisor warnings that are real:
-- mutable search_path, SECURITY DEFINER RPC exposure, auth.uid() initplan, missing FK indexes.
-- Keep staff+client permissive policies (expected dual access). Do not drop "unused" indexes
-- on a still-young ops dataset.

-- ---------------------------------------------------------------------------
-- Trigger: pin search_path
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.documents_hide_disposed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.disposed_at IS NOT NULL THEN
    NEW.visible_to_client := false;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.documents_hide_disposed() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- SECURITY DEFINER helpers: not callable as anonymous RPC
-- (authenticated EXECUTE stays - RLS policies run as the requesting role)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO service_role;

REVOKE ALL ON FUNCTION public.is_project_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_project_member(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.client_project_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.client_project_ids() FROM anon;
GRANT EXECUTE ON FUNCTION public.client_project_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_project_ids() TO service_role;

REVOKE ALL ON FUNCTION public.client_organization_ids() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.client_organization_ids() FROM anon;
GRANT EXECUTE ON FUNCTION public.client_organization_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.client_organization_ids() TO service_role;

REVOKE ALL ON FUNCTION public.is_organization_client(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_organization_client(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_organization_client(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_client(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.is_admin_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_staff() TO service_role;

REVOKE ALL ON FUNCTION public.is_careers_review_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_careers_review_staff() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_careers_review_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_careers_review_staff() TO service_role;

REVOKE ALL ON FUNCTION public.staff_has_capability(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_has_capability(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.staff_has_capability(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_has_capability(text) TO service_role;

-- Event trigger only; must not be exposed via PostgREST RPC.
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM service_role;

-- ---------------------------------------------------------------------------
-- auth.uid() initplan: wrap in (select ...) so Postgres caches once per query
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_read_own_profile ON public.staff_profiles;
CREATE POLICY staff_read_own_profile ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS client_read_members ON public.project_members;
CREATE POLICY client_read_members ON public.project_members
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS client_read_own_legal_reaccept ON public.legal_reacceptance_notifications;
CREATE POLICY client_read_own_legal_reaccept ON public.legal_reacceptance_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS client_insert_file_access ON public.file_access_log;
CREATE POLICY client_insert_file_access ON public.file_access_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    project_id IN (SELECT public.client_project_ids())
    AND actor_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS client_read_own_file_access ON public.file_access_log;
CREATE POLICY client_read_own_file_access ON public.file_access_log
  FOR SELECT
  TO authenticated
  USING (actor_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS staff_read_own_ops_staff_contracts ON public.ops_staff_contracts;
CREATE POLICY staff_read_own_ops_staff_contracts ON public.ops_staff_contracts
  FOR SELECT
  TO authenticated
  USING (staff_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS staff_read_own_personnel_offer ON public.ops_personnel_offers;
CREATE POLICY staff_read_own_personnel_offer ON public.ops_personnel_offers
  FOR SELECT
  TO authenticated
  USING (staff_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Covering indexes for unindexed foreign keys
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS activity_log_actor_id_idx
  ON public.activity_log (actor_id);
CREATE INDEX IF NOT EXISTS document_requests_created_by_idx
  ON public.document_requests (created_by);
CREATE INDEX IF NOT EXISTS document_requests_fulfilled_document_id_idx
  ON public.document_requests (fulfilled_document_id);
CREATE INDEX IF NOT EXISTS documents_uploaded_by_idx
  ON public.documents (uploaded_by);
CREATE INDEX IF NOT EXISTS file_access_log_actor_id_idx
  ON public.file_access_log (actor_id);
CREATE INDEX IF NOT EXISTS file_access_log_document_id_idx
  ON public.file_access_log (document_id);
CREATE INDEX IF NOT EXISTS inbox_messages_lead_id_idx
  ON public.inbox_messages (lead_id);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx
  ON public.leads (assigned_to);
CREATE INDEX IF NOT EXISTS leads_converted_project_id_idx
  ON public.leads (converted_project_id);
CREATE INDEX IF NOT EXISTS legal_document_versions_published_by_idx
  ON public.legal_document_versions (published_by);
CREATE INDEX IF NOT EXISTS legal_reacceptance_notifications_user_id_idx
  ON public.legal_reacceptance_notifications (user_id);
CREATE INDEX IF NOT EXISTS milestone_updates_created_by_idx
  ON public.milestone_updates (created_by);
CREATE INDEX IF NOT EXISTS milestone_updates_milestone_id_idx
  ON public.milestone_updates (milestone_id);
CREATE INDEX IF NOT EXISTS ops_hunt_reports_reviewed_by_idx
  ON public.ops_hunt_reports (reviewed_by);
CREATE INDEX IF NOT EXISTS ops_job_applications_personnel_offer_id_idx
  ON public.ops_job_applications (personnel_offer_id);
CREATE INDEX IF NOT EXISTS ops_job_postings_created_by_idx
  ON public.ops_job_postings (created_by);
CREATE INDEX IF NOT EXISTS ops_personnel_offers_created_by_idx
  ON public.ops_personnel_offers (created_by);
CREATE INDEX IF NOT EXISTS ops_staff_contracts_offer_id_idx
  ON public.ops_staff_contracts (offer_id);
CREATE INDEX IF NOT EXISTS ops_staff_contracts_uploaded_by_idx
  ON public.ops_staff_contracts (uploaded_by);
CREATE INDEX IF NOT EXISTS organizations_mutual_nda_document_id_idx
  ON public.organizations (mutual_nda_document_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx
  ON public.project_members (user_id);
CREATE INDEX IF NOT EXISTS project_release_requests_approved_by_idx
  ON public.project_release_requests (approved_by);
CREATE INDEX IF NOT EXISTS project_release_requests_requested_by_idx
  ON public.project_release_requests (requested_by);
CREATE INDEX IF NOT EXISTS project_sprints_created_by_idx
  ON public.project_sprints (created_by);
CREATE INDEX IF NOT EXISTS projects_lead_id_idx
  ON public.projects (lead_id);
CREATE INDEX IF NOT EXISTS projects_organization_id_idx
  ON public.projects (organization_id);
CREATE INDEX IF NOT EXISTS quote_access_tokens_quote_id_idx
  ON public.quote_access_tokens (quote_id);
CREATE INDEX IF NOT EXISTS quotes_accepted_by_idx
  ON public.quotes (accepted_by);
CREATE INDEX IF NOT EXISTS quotes_created_by_idx
  ON public.quotes (created_by);
CREATE INDEX IF NOT EXISTS ticket_attachments_ticket_id_idx
  ON public.ticket_attachments (ticket_id);
CREATE INDEX IF NOT EXISTS tickets_assigned_to_idx
  ON public.tickets (assigned_to);
CREATE INDEX IF NOT EXISTS tickets_organization_id_idx
  ON public.tickets (organization_id);
CREATE INDEX IF NOT EXISTS tickets_project_id_idx
  ON public.tickets (project_id);
