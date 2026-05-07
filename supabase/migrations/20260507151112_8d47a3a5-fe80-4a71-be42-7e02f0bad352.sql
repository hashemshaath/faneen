
-- 1) Approval status enum
DO $$ BEGIN
  CREATE TYPE public.business_approval_status AS ENUM (
    'draft','submitted','under_review','approved','rejected','needs_changes','published'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.username_status AS ENUM ('pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Add columns to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS approval_status public.business_approval_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approval_notes  text,
  ADD COLUMN IF NOT EXISTS submitted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at     timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by     uuid,
  ADD COLUMN IF NOT EXISTS username_status public.username_status NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS onboarding_completion smallint NOT NULL DEFAULT 0
    CHECK (onboarding_completion BETWEEN 0 AND 100);

-- Backfill: existing active businesses are already public, mark as 'published' & username 'approved'
UPDATE public.businesses
   SET approval_status = 'published',
       username_status = 'approved',
       onboarding_completion = 100
 WHERE is_active = true
   AND approval_status = 'draft';

CREATE INDEX IF NOT EXISTS idx_businesses_approval_status
  ON public.businesses (approval_status);

-- 3) Onboarding draft on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_draft_updated_at timestamptz;

CREATE OR REPLACE FUNCTION public.touch_onboarding_draft()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.onboarding_draft IS DISTINCT FROM OLD.onboarding_draft THEN
    NEW.onboarding_draft_updated_at = now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_touch_onboarding_draft ON public.profiles;
CREATE TRIGGER trg_touch_onboarding_draft
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_onboarding_draft();

-- 4) Update public masking function to gate on approval_status as well
CREATE OR REPLACE FUNCTION public.get_public_business_data(_business_id uuid)
RETURNS TABLE(id uuid, user_id uuid, name_ar text, name_en text, username character varying,
  description_ar text, description_en text, short_description_ar text, short_description_en text,
  category_id uuid, city_id uuid, country_id uuid, logo_url text, cover_url text,
  phone character varying, mobile text, email character varying, website text, address text,
  region text, district text, street_name text, latitude numeric, longitude numeric,
  is_verified boolean, is_active boolean, rating_avg numeric, rating_count integer,
  membership_tier membership_tier, business_number integer, ref_id text,
  created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT id, user_id, name_ar, name_en,
    username, description_ar, description_en,
    short_description_ar, short_description_en,
    category_id, city_id, country_id,
    logo_url, cover_url, phone, mobile,
    email, website, address,
    region, district, street_name,
    latitude, longitude,
    is_verified, is_active,
    rating_avg, rating_count,
    membership_tier, business_number, ref_id,
    created_at, updated_at
  FROM public.businesses
  WHERE id = _business_id
    AND is_active = true
    AND approval_status IN ('approved','published');
$function$;

-- 5) Compute onboarding completion helper (used by app on save)
CREATE OR REPLACE FUNCTION public.compute_business_onboarding_completion(_business_id uuid)
RETURNS smallint
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  b public.businesses%ROWTYPE;
  total int := 12;
  filled int := 0;
BEGIN
  SELECT * INTO b FROM public.businesses WHERE id = _business_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF coalesce(b.name_ar,'') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(b.username,'') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(b.logo_url,'') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(b.description_ar, b.short_description_ar, '') <> '' THEN filled := filled + 1; END IF;
  IF b.category_id IS NOT NULL THEN filled := filled + 1; END IF;
  IF b.city_id IS NOT NULL THEN filled := filled + 1; END IF;
  IF coalesce(b.phone, b.mobile, '') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(b.email,'') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(b.address,'') <> '' THEN filled := filled + 1; END IF;
  IF EXISTS (SELECT 1 FROM public.business_branches WHERE business_id = _business_id) THEN filled := filled + 1; END IF;
  IF EXISTS (SELECT 1 FROM public.services WHERE business_id = _business_id) THEN filled := filled + 1; END IF;
  IF EXISTS (SELECT 1 FROM public.projects WHERE business_id = _business_id) THEN filled := filled + 1; END IF;

  RETURN ((filled::numeric / total) * 100)::smallint;
END $$;

-- 6) Submit-for-review action
CREATE OR REPLACE FUNCTION public.submit_business_for_review(_business_id uuid)
RETURNS public.business_approval_status
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _is_owner boolean;
  _completion smallint;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.businesses WHERE id = _business_id AND user_id = auth.uid())
    INTO _is_owner;
  IF NOT _is_owner AND NOT public.has_admin_access(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  _completion := public.compute_business_onboarding_completion(_business_id);
  IF _completion < 50 THEN
    RAISE EXCEPTION 'Onboarding completion must be at least 50%% before submission'
      USING HINT = 'low_completion';
  END IF;

  UPDATE public.businesses
     SET approval_status = 'submitted',
         submitted_at = now(),
         onboarding_completion = _completion
   WHERE id = _business_id
   RETURNING approval_status INTO _completion; -- discard

  RETURN 'submitted';
END $$;
