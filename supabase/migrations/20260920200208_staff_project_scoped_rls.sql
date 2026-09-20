-- C1: staff JWT no escribe tablas sensibles; SELECT acotado a projects_all o project_staff.
-- Escrituras de Ops van por service_role (server actions). Clientes leen con policies client_*.

CREATE OR REPLACE FUNCTION public.staff_can_access_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND public.is_staff()
    AND (
      public.staff_has_capability('projects_all')
      OR EXISTS (
        SELECT 1
        FROM public.project_staff ps
        WHERE ps.project_id = p_project_id
          AND ps.staff_id = auth.uid()
      )
    );
$$;

COMMENT ON FUNCTION public.staff_can_access_project(uuid) IS
  'Staff activo con projects_all o fila en project_staff. SECURITY DEFINER evita recursión RLS.';

REVOKE ALL ON FUNCTION public.staff_can_access_project(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_can_access_project(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.staff_can_access_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_can_access_project(uuid) TO service_role;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'projects',
    'documents',
    'deliverables',
    'quotes',
    'quote_access_tokens',
    'leads',
    'organizations',
    'tickets',
    'ticket_attachments',
    'saas_instances',
    'saas_usage_counters',
    'saas_usage_events',
    'saas_vendor_slots',
    'project_charges',
    'project_members',
    'milestones',
    'milestone_updates',
    'document_requests',
    'project_staff',
    'project_sprints',
    'sprint_items',
    'time_entries',
    'project_site_access',
    'inbox_messages',
    'portal_user_profiles',
    'legal_document_versions',
    'legal_reacceptance_notifications'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM anon, authenticated',
      t
    );
    EXECUTE format('GRANT SELECT ON TABLE public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Staff SELECT policies (client_* se conservan)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS staff_all_projects ON public.projects;
DROP POLICY IF EXISTS staff_select_projects ON public.projects;
CREATE POLICY staff_select_projects ON public.projects FOR SELECT
  USING (public.staff_can_access_project(id));

DROP POLICY IF EXISTS staff_all_documents ON public.documents;
DROP POLICY IF EXISTS staff_select_documents ON public.documents;
CREATE POLICY staff_select_documents ON public.documents FOR SELECT
  USING (
    (project_id IS NOT NULL AND public.staff_can_access_project(project_id))
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.organization_id = documents.organization_id
          AND public.staff_can_access_project(p.id)
      )
    )
  );

DROP POLICY IF EXISTS staff_all_deliverables ON public.deliverables;
DROP POLICY IF EXISTS staff_select_deliverables ON public.deliverables;
CREATE POLICY staff_select_deliverables ON public.deliverables FOR SELECT
  USING (public.staff_can_access_project(project_id));

DROP POLICY IF EXISTS staff_all_quotes ON public.quotes;
DROP POLICY IF EXISTS staff_read_quotes ON public.quotes;
DROP POLICY IF EXISTS admin_write_quotes ON public.quotes;
CREATE POLICY staff_select_quotes ON public.quotes FOR SELECT
  USING (
    (project_id IS NOT NULL AND public.staff_can_access_project(project_id))
    OR (project_id IS NULL AND public.staff_has_capability('quotes'))
  );

DROP POLICY IF EXISTS staff_all_quote_tokens ON public.quote_access_tokens;
CREATE POLICY staff_select_quote_tokens ON public.quote_access_tokens FOR SELECT
  USING (
    public.staff_has_capability('quotes')
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_access_tokens.quote_id
        AND (
          (q.project_id IS NOT NULL AND public.staff_can_access_project(q.project_id))
          OR (q.project_id IS NULL AND public.staff_has_capability('quotes'))
        )
    )
  );

DROP POLICY IF EXISTS staff_all_leads ON public.leads;
CREATE POLICY staff_select_leads ON public.leads FOR SELECT
  USING (public.staff_has_capability('leads'));

DROP POLICY IF EXISTS staff_all_organizations ON public.organizations;
CREATE POLICY staff_select_organizations ON public.organizations FOR SELECT
  USING (
    public.staff_has_capability('organizations')
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.organization_id = organizations.id
        AND public.staff_can_access_project(p.id)
    )
  );

DROP POLICY IF EXISTS staff_all_tickets ON public.tickets;
CREATE POLICY staff_select_tickets ON public.tickets FOR SELECT
  USING (
    (project_id IS NOT NULL AND public.staff_can_access_project(project_id))
    OR (project_id IS NULL AND public.staff_has_capability('tickets'))
  );

DROP POLICY IF EXISTS staff_all_ticket_attachments ON public.ticket_attachments;
CREATE POLICY staff_select_ticket_attachments ON public.ticket_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_attachments.ticket_id
        AND (
          (t.project_id IS NOT NULL AND public.staff_can_access_project(t.project_id))
          OR (t.project_id IS NULL AND public.staff_has_capability('tickets'))
        )
    )
  );

DROP POLICY IF EXISTS staff_all_saas_instances ON public.saas_instances;
CREATE POLICY staff_select_saas_instances ON public.saas_instances FOR SELECT
  USING (
    public.staff_has_capability('saas_licenses')
    AND public.staff_can_access_project(project_id)
  );

DROP POLICY IF EXISTS staff_all_saas_usage_counters ON public.saas_usage_counters;
CREATE POLICY staff_select_saas_usage_counters ON public.saas_usage_counters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saas_instances i
      WHERE i.id = saas_usage_counters.instance_id
        AND public.staff_has_capability('saas_licenses')
        AND public.staff_can_access_project(i.project_id)
    )
  );

DROP POLICY IF EXISTS staff_all_saas_usage_events ON public.saas_usage_events;
CREATE POLICY staff_select_saas_usage_events ON public.saas_usage_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saas_instances i
      WHERE i.id = saas_usage_events.instance_id
        AND public.staff_has_capability('saas_licenses')
        AND public.staff_can_access_project(i.project_id)
    )
  );

DROP POLICY IF EXISTS staff_all_saas_vendor_slots ON public.saas_vendor_slots;
CREATE POLICY staff_select_saas_vendor_slots ON public.saas_vendor_slots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.saas_instances i
      WHERE i.id = saas_vendor_slots.instance_id
        AND public.staff_has_capability('saas_licenses')
        AND public.staff_can_access_project(i.project_id)
    )
  );

DROP POLICY IF EXISTS staff_all_project_charges ON public.project_charges;
DROP POLICY IF EXISTS staff_read_project_charges ON public.project_charges;
DROP POLICY IF EXISTS admin_write_project_charges ON public.project_charges;
CREATE POLICY staff_select_project_charges ON public.project_charges FOR SELECT
  USING (public.staff_can_access_project(project_id));

DROP POLICY IF EXISTS staff_all_members ON public.project_members;
CREATE POLICY staff_select_members ON public.project_members FOR SELECT
  USING (public.staff_can_access_project(project_id));

DROP POLICY IF EXISTS staff_all_milestones ON public.milestones;
CREATE POLICY staff_select_milestones ON public.milestones FOR SELECT
  USING (public.staff_can_access_project(project_id));

DROP POLICY IF EXISTS staff_all_milestone_updates ON public.milestone_updates;
CREATE POLICY staff_select_milestone_updates ON public.milestone_updates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.milestones m
      WHERE m.id = milestone_updates.milestone_id
        AND public.staff_can_access_project(m.project_id)
    )
  );

DROP POLICY IF EXISTS staff_all_document_requests ON public.document_requests;
CREATE POLICY staff_select_document_requests ON public.document_requests FOR SELECT
  USING (public.staff_can_access_project(project_id));

DROP POLICY IF EXISTS staff_all_project_staff ON public.project_staff;
CREATE POLICY staff_select_project_staff ON public.project_staff FOR SELECT
  USING (
    public.is_staff()
    AND (
      public.staff_has_capability('projects_all')
      OR staff_id = auth.uid()
      OR public.staff_can_access_project(project_id)
    )
  );

DROP POLICY IF EXISTS staff_all_project_sprints ON public.project_sprints;
CREATE POLICY staff_select_project_sprints ON public.project_sprints FOR SELECT
  USING (public.staff_can_access_project(project_id));

DROP POLICY IF EXISTS staff_all_sprint_items ON public.sprint_items;
CREATE POLICY staff_select_sprint_items ON public.sprint_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_sprints s
      WHERE s.id = sprint_items.sprint_id
        AND public.staff_can_access_project(s.project_id)
    )
  );

DROP POLICY IF EXISTS staff_all_time_entries ON public.time_entries;
CREATE POLICY staff_select_time_entries ON public.time_entries FOR SELECT
  USING (public.staff_can_access_project(project_id));

DROP POLICY IF EXISTS staff_all_project_site_access ON public.project_site_access;
CREATE POLICY staff_select_project_site_access ON public.project_site_access FOR SELECT
  USING (public.staff_can_access_project(project_id));

DROP POLICY IF EXISTS staff_all_inbox ON public.inbox_messages;
CREATE POLICY staff_select_inbox ON public.inbox_messages FOR SELECT
  USING (public.staff_has_capability('inbox'));

DROP POLICY IF EXISTS staff_all_portal_user_profiles ON public.portal_user_profiles;
CREATE POLICY staff_select_portal_user_profiles ON public.portal_user_profiles FOR SELECT
  USING (public.staff_has_capability('portal_users'));

DROP POLICY IF EXISTS staff_all_legal_versions ON public.legal_document_versions;
CREATE POLICY staff_select_legal_versions ON public.legal_document_versions FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS staff_all_legal_reaccept ON public.legal_reacceptance_notifications;
CREATE POLICY staff_select_legal_reaccept ON public.legal_reacceptance_notifications FOR SELECT
  USING (public.is_staff());

-- Releases: SELECT acotado; writes siguen en JWT hasta migrar actions (GRANT intacto).
DROP POLICY IF EXISTS staff_all_project_release_settings ON public.project_release_settings;
CREATE POLICY staff_all_project_release_settings ON public.project_release_settings
  FOR ALL
  USING (public.staff_can_access_project(project_id))
  WITH CHECK (public.staff_can_access_project(project_id));

DROP POLICY IF EXISTS staff_all_project_release_requests ON public.project_release_requests;
CREATE POLICY staff_all_project_release_requests ON public.project_release_requests
  FOR ALL
  USING (public.staff_can_access_project(project_id))
  WITH CHECK (public.staff_can_access_project(project_id));

-- ---------------------------------------------------------------------------
-- Storage ops-files: sin SELECT/INSERT de JWT. Descarga vía /api/ops/file (admin).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS staff_storage_all ON storage.objects;
DROP POLICY IF EXISTS client_storage_read ON storage.objects;
DROP POLICY IF EXISTS client_storage_insert ON storage.objects;
