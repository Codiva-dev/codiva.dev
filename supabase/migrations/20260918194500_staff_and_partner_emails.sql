-- Cache auth emails on staff and interview partners so team lists skip N+1 getUserById.

ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.staff_profiles AS profile
SET email = auth_user.email
FROM auth.users AS auth_user
WHERE profile.id = auth_user.id
  AND COALESCE(btrim(profile.email), '') = '';

ALTER TABLE public.ops_recruiting_partner_members
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.ops_recruiting_partner_members AS member
SET email = auth_user.email
FROM auth.users AS auth_user
WHERE member.user_id = auth_user.id
  AND COALESCE(btrim(member.email), '') = '';
