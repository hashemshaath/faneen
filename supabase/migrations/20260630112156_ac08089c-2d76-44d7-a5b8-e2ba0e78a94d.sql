ALTER TABLE public.email_login_otps
  DROP CONSTRAINT IF EXISTS email_login_otps_user_id_fkey;

CREATE OR REPLACE FUNCTION public.resolve_auth_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id
  FROM auth.users
  WHERE lower(email) = lower(trim(_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_auth_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_auth_user_id_by_email(text) TO service_role;