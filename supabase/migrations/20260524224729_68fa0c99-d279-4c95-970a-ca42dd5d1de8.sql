
-- 1) Add username to profiles (nullable; individuals are optional)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username varchar(50);

-- Case-insensitive uniqueness on profiles.username (partial: only when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL AND username <> '';

-- 2) Reserved usernames (system routes, brand-protected words)
CREATE TABLE IF NOT EXISTS public.reserved_usernames (
  name text PRIMARY KEY,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reserved_usernames ENABLE ROW LEVEL SECURITY;

-- Public can read reserved list (used for hint UX), only admins can mutate
DROP POLICY IF EXISTS "reserved_usernames_read_all" ON public.reserved_usernames;
CREATE POLICY "reserved_usernames_read_all"
  ON public.reserved_usernames FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "reserved_usernames_admin_write" ON public.reserved_usernames;
CREATE POLICY "reserved_usernames_admin_write"
  ON public.reserved_usernames FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Seed reserved words (idempotent)
INSERT INTO public.reserved_usernames (name, reason) VALUES
  ('admin','system'), ('administrator','system'), ('root','system'),
  ('api','system'), ('auth','system'), ('login','system'), ('logout','system'),
  ('register','system'), ('signup','system'), ('signin','system'),
  ('dashboard','system'), ('settings','system'), ('account','system'),
  ('profile','system'), ('search','system'), ('messages','system'),
  ('notifications','system'), ('contracts','system'), ('bookings','system'),
  ('projects','system'), ('offers','system'), ('promotions','system'),
  ('blog','system'), ('docs','system'), ('help','system'), ('support','system'),
  ('about','system'), ('contact','system'), ('privacy','system'), ('terms','system'),
  ('legal','system'), ('cookies','system'), ('sitemap','system'),
  ('home','system'), ('index','system'), ('app','system'), ('static','system'),
  ('assets','system'), ('public','system'), ('uploads','system'),
  ('qitaat','brand'), ('faneen','brand'), ('lovable','brand'), ('supabase','brand'),
  ('superadmin','system'), ('owner','system'), ('staff','system'), ('team','system'),
  ('verify','system'), ('verification','system'), ('callback','system'),
  ('oauth','system'), ('webhook','system'), ('cdn','system'),
  ('null','reserved'), ('undefined','reserved'), ('true','reserved'), ('false','reserved'),
  ('sectors','system'), ('categories','system'), ('compare','system'),
  ('reviews','system'), ('users','system'), ('businesses','system'),
  ('me','system'), ('you','system'), ('new','system'), ('edit','system'),
  ('delete','system'), ('create','system'), ('id','system'), ('uuid','system')
ON CONFLICT (name) DO NOTHING;

-- 3) Username format validator (length, charset, starts with letter, reserved)
CREATE OR REPLACE FUNCTION public.is_valid_username(_username text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u text;
BEGIN
  IF _username IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'empty');
  END IF;
  u := lower(trim(_username));
  IF length(u) < 3 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'too_short');
  END IF;
  IF length(u) > 30 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'too_long');
  END IF;
  IF u !~ '^[a-z][a-z0-9_-]{2,29}$' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_format');
  END IF;
  -- Reject consecutive separators / trailing separators for visual cleanliness
  IF u ~ '(--|__|-_|_-)' OR u ~ '[-_]$' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_format');
  END IF;
  IF EXISTS (SELECT 1 FROM public.reserved_usernames r WHERE r.name = u) THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'reserved');
  END IF;
  RETURN jsonb_build_object('valid', true, 'normalized', u);
END;
$$;

REVOKE ALL ON FUNCTION public.is_valid_username(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_valid_username(text) TO anon, authenticated;

-- 4) Global availability check across profiles + businesses
CREATE OR REPLACE FUNCTION public.check_username_available(
  _username text,
  _exclude_user uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v jsonb;
  u text;
  taken_by text;
BEGIN
  v := public.is_valid_username(_username);
  IF NOT (v->>'valid')::boolean THEN
    RETURN jsonb_build_object('available', false, 'reason', v->>'reason');
  END IF;
  u := v->>'normalized';

  -- Businesses (case-insensitive)
  IF EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE lower(b.username) = u
      AND (_exclude_user IS NULL OR b.user_id <> _exclude_user)
  ) THEN
    taken_by := 'business';
  -- Profiles (case-insensitive)
  ELSIF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.username) = u
      AND (_exclude_user IS NULL OR p.user_id <> _exclude_user)
  ) THEN
    taken_by := 'profile';
  END IF;

  IF taken_by IS NOT NULL THEN
    RETURN jsonb_build_object('available', false, 'reason', 'taken', 'taken_by', taken_by);
  END IF;
  RETURN jsonb_build_object('available', true, 'normalized', u);
END;
$$;

REVOKE ALL ON FUNCTION public.check_username_available(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.check_username_available(text, uuid) TO anon, authenticated;

-- 5) Enforce on writes: profiles trigger blocks invalid / colliding usernames
CREATE OR REPLACE FUNCTION public.enforce_profile_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res jsonb;
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    RETURN NEW;
  END IF;

  NEW.username := lower(trim(NEW.username));

  -- Skip work on UPDATE when username unchanged
  IF TG_OP = 'UPDATE' AND OLD.username IS NOT DISTINCT FROM NEW.username THEN
    RETURN NEW;
  END IF;

  res := public.check_username_available(NEW.username, NEW.user_id);
  IF NOT (res->>'available')::boolean THEN
    RAISE EXCEPTION 'username_unavailable: %', res->>'reason'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_username ON public.profiles;
CREATE TRIGGER trg_enforce_profile_username
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_username();

-- 6) Same enforcement for businesses (collision against profiles)
CREATE OR REPLACE FUNCTION public.enforce_business_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res jsonb;
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    RETURN NEW;
  END IF;

  NEW.username := lower(trim(NEW.username));

  IF TG_OP = 'UPDATE' AND OLD.username IS NOT DISTINCT FROM NEW.username THEN
    RETURN NEW;
  END IF;

  res := public.check_username_available(NEW.username, NEW.user_id);
  IF NOT (res->>'available')::boolean THEN
    RAISE EXCEPTION 'username_unavailable: %', res->>'reason'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_business_username ON public.businesses;
CREATE TRIGGER trg_enforce_business_username
  BEFORE INSERT OR UPDATE OF username ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_business_username();
