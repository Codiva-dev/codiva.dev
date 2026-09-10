-- Partner hub users: one login can be associated to every partner project we attach.

CREATE TABLE IF NOT EXISTS public.portal_user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_hub boolean NOT NULL DEFAULT false,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.portal_user_profiles IS
  'Perfil de usuarios del portal. is_hub = partner universal: se asocia a proyectos de intermediario.';

CREATE INDEX IF NOT EXISTS portal_user_profiles_hub_idx
  ON public.portal_user_profiles (user_id)
  WHERE is_hub = true;

ALTER TABLE public.portal_user_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.portal_user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.portal_user_profiles TO service_role;
REVOKE ALL ON TABLE public.portal_user_profiles FROM anon;

DROP POLICY IF EXISTS staff_all_portal_user_profiles ON public.portal_user_profiles;
CREATE POLICY staff_all_portal_user_profiles ON public.portal_user_profiles FOR ALL
  TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS user_read_own_portal_profile ON public.portal_user_profiles;
CREATE POLICY user_read_own_portal_profile ON public.portal_user_profiles FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
