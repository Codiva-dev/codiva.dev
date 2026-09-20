-- Allow saas_licenses on staff_profiles.capabilities and grant it to admin/pm.

ALTER TABLE public.staff_profiles
  DROP CONSTRAINT IF EXISTS staff_profiles_capabilities_known;

ALTER TABLE public.staff_profiles
  ADD CONSTRAINT staff_profiles_capabilities_known
  CHECK (
    capabilities <@ ARRAY[
      'leads',
      'inbox',
      'quotes',
      'charges',
      'portal_users',
      'organizations',
      'workload',
      'time_entries',
      'team',
      'careers_review',
      'legal_publish',
      'projects_all',
      'projects_create',
      'milestones_write',
      'sprints_plan',
      'sprints_update_own',
      'documents',
      'deliverables',
      'site_access',
      'tickets',
      'dashboard_finance',
      'saas_licenses',
      'settings_profile',
      'assignments',
      'assignments_manage'
    ]::text[]
  );

UPDATE public.staff_profiles
SET capabilities = capabilities || ARRAY['saas_licenses']
WHERE NOT ('saas_licenses' = ANY (capabilities))
  AND role IN ('admin', 'pm');
