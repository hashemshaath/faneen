-- 1) Sync the remaining mismatched auth emails to the user-facing profile email.
UPDATE auth.users u
SET email = p.email,
    email_confirmed_at = COALESCE(u.email_confirmed_at, now()),
    updated_at = now()
FROM public.profiles p
WHERE p.user_id = u.id
  AND p.email IS NOT NULL
  AND p.email <> u.email
  AND NOT EXISTS (SELECT 1 FROM auth.users u2 WHERE u2.email = p.email AND u2.id <> u.id);

UPDATE auth.identities i
SET identity_data = jsonb_set(i.identity_data, '{email}', to_jsonb(u.email)),
    updated_at = now()
FROM auth.users u
WHERE i.user_id = u.id
  AND i.provider = 'email'
  AND COALESCE(i.identity_data->>'email','') <> u.email;

-- 2) Enforce uniqueness of profiles.email (case-insensitive, ignoring NULLs).
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique_ci
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

-- 3) Single source of truth: auth.users.email is canonical.
--    Trigger keeps profiles.email mirrored automatically whenever auth email changes.
CREATE OR REPLACE FUNCTION public.sync_profile_email_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    UPDATE public.profiles
       SET email = NEW.email,
           updated_at = now()
     WHERE user_id = NEW.id
       AND COALESCE(email,'') IS DISTINCT FROM COALESCE(NEW.email,'');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_email_from_auth ON auth.users;
CREATE TRIGGER trg_sync_profile_email_from_auth
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email_from_auth();