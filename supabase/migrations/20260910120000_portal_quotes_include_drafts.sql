-- Client portal: a quote marked visible_to_client is readable even as draft.
-- Sending still gates accept/reject; this matches the “mostrar en portal” toggle.

DROP POLICY IF EXISTS client_read_quotes ON quotes;
CREATE POLICY client_read_quotes ON quotes FOR SELECT
  USING (
    visible_to_client = true
    AND status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')
    AND project_id IN (SELECT public.client_project_ids())
  );
