-- Add temporary suspension support to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banned_until timestamptz NULL,
  ADD COLUMN IF NOT EXISTS ban_reason text NULL;

COMMENT ON COLUMN public.profiles.banned_until IS
  'When set, the ban is temporary and lifts automatically at this timestamp. NULL with is_banned=true means a permanent ban.';
COMMENT ON COLUMN public.profiles.ban_reason IS
  'Optional human-readable reason captured by the admin who applied the ban.';

CREATE INDEX IF NOT EXISTS idx_profiles_banned_until
  ON public.profiles (banned_until)
  WHERE banned_until IS NOT NULL;

-- Auto-clear expired temporary bans on any profile update.
CREATE OR REPLACE FUNCTION public.auto_clear_expired_ban()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_banned = true
     AND NEW.banned_until IS NOT NULL
     AND NEW.banned_until <= now() THEN
    NEW.is_banned := false;
    NEW.banned_until := NULL;
    NEW.ban_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_auto_clear_expired_ban ON public.profiles;
CREATE TRIGGER trg_profiles_auto_clear_expired_ban
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_clear_expired_ban();