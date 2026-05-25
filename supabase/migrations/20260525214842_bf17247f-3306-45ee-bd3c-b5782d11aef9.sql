
-- 1) Case-insensitive unique on businesses.username (replace existing case-sensitive constraint)
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_username_key;
DROP INDEX IF EXISTS public.businesses_username_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_username_unique
  ON public.businesses (lower(username))
  WHERE username IS NOT NULL AND username <> '';

-- 2) Cross-table uniqueness enforcement
CREATE OR REPLACE FUNCTION public.enforce_global_username_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u text;
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    RETURN NEW;
  END IF;
  u := lower(NEW.username);

  IF TG_TABLE_NAME = 'businesses' THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE lower(p.username) = u
        AND p.user_id <> NEW.user_id
    ) THEN
      RAISE EXCEPTION 'username_taken_by_profile'
        USING ERRCODE = 'unique_violation';
    END IF;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    IF EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE lower(b.username) = u
        AND b.user_id <> NEW.user_id
    ) THEN
      RAISE EXCEPTION 'username_taken_by_business'
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_username_global_unique ON public.businesses;
CREATE TRIGGER trg_businesses_username_global_unique
  BEFORE INSERT OR UPDATE OF username ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_global_username_unique();

DROP TRIGGER IF EXISTS trg_profiles_username_global_unique ON public.profiles;
CREATE TRIGGER trg_profiles_username_global_unique
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_global_username_unique();
