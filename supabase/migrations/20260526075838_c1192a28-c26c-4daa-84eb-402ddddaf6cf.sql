
-- =============================================================================
-- Central addresses microservice — unified address table for profiles,
-- businesses, and branches. Polymorphic owner_type + owner_id (no FK because
-- owner can be one of three tables). RLS enforces access per owner type.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.addresses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type          text NOT NULL CHECK (owner_type IN ('profile','business','branch')),
  owner_id            uuid NOT NULL,
  label               text,
  is_primary          boolean NOT NULL DEFAULT false,

  -- SPL / national address
  short_address       text,
  building_number     text,
  additional_number   text,
  post_code           text,

  -- Geo
  country_id          uuid,
  city_id             uuid,
  latitude            numeric,
  longitude           numeric,

  -- Bilingual textual fields
  region              text,
  region_en           text,
  district            text,
  district_en         text,
  street_name         text,
  street_name_en      text,
  address             text,
  address_en          text,

  source              text NOT NULL DEFAULT 'manual'
                       CHECK (source IN ('spl','map_pick','manual','import')),
  verified_at         timestamptz,
  created_by          uuid,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS addresses_owner_idx
  ON public.addresses (owner_type, owner_id);
CREATE INDEX IF NOT EXISTS addresses_short_address_idx
  ON public.addresses (short_address) WHERE short_address IS NOT NULL;
-- Only one primary address per owner.
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_primary_per_owner_idx
  ON public.addresses (owner_type, owner_id) WHERE is_primary;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- updated_at maintenance
CREATE OR REPLACE FUNCTION public.addresses_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS addresses_set_updated_at ON public.addresses;
CREATE TRIGGER addresses_set_updated_at
BEFORE UPDATE ON public.addresses
FOR EACH ROW EXECUTE FUNCTION public.addresses_set_updated_at();

-- Demote any other primary row for the same owner when one is promoted.
CREATE OR REPLACE FUNCTION public.addresses_enforce_single_primary()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.addresses
       SET is_primary = false
     WHERE owner_type = NEW.owner_type
       AND owner_id   = NEW.owner_id
       AND id <> NEW.id
       AND is_primary;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS addresses_enforce_single_primary ON public.addresses;
CREATE TRIGGER addresses_enforce_single_primary
AFTER INSERT OR UPDATE OF is_primary, owner_type, owner_id ON public.addresses
FOR EACH ROW EXECUTE FUNCTION public.addresses_enforce_single_primary();

-- ---------------------------------------------------------------------------
-- Ownership / access helpers
-- ---------------------------------------------------------------------------

-- Returns true if auth.uid() may read the given (owner_type, owner_id) row.
CREATE OR REPLACE FUNCTION public.can_access_address(
  _owner_type text,
  _owner_id   uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN false; END IF;
  IF public.has_role(uid, 'admin') THEN RETURN true; END IF;

  IF _owner_type = 'profile' THEN
    RETURN _owner_id = uid;
  ELSIF _owner_type = 'business' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.businesses b
       WHERE b.id = _owner_id
         AND (b.user_id = uid
              OR EXISTS (SELECT 1 FROM public.business_staff s
                           WHERE s.business_id = b.id
                             AND s.user_id = uid))
    );
  ELSIF _owner_type = 'branch' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.business_branches br
        JOIN public.businesses b ON b.id = br.business_id
       WHERE br.id = _owner_id
         AND (b.user_id = uid
              OR EXISTS (SELECT 1 FROM public.business_staff s
                           WHERE s.business_id = b.id
                             AND s.user_id = uid))
    );
  END IF;
  RETURN false;
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "addresses owner select" ON public.addresses;
CREATE POLICY "addresses owner select"
ON public.addresses FOR SELECT TO authenticated
USING (public.can_access_address(owner_type, owner_id));

DROP POLICY IF EXISTS "addresses owner insert" ON public.addresses;
CREATE POLICY "addresses owner insert"
ON public.addresses FOR INSERT TO authenticated
WITH CHECK (public.can_access_address(owner_type, owner_id));

DROP POLICY IF EXISTS "addresses owner update" ON public.addresses;
CREATE POLICY "addresses owner update"
ON public.addresses FOR UPDATE TO authenticated
USING (public.can_access_address(owner_type, owner_id))
WITH CHECK (public.can_access_address(owner_type, owner_id));

DROP POLICY IF EXISTS "addresses owner delete" ON public.addresses;
CREATE POLICY "addresses owner delete"
ON public.addresses FOR DELETE TO authenticated
USING (public.can_access_address(owner_type, owner_id));

-- No grants to anon — anonymous visitors cannot see private addresses.
REVOKE ALL ON public.addresses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;

-- ---------------------------------------------------------------------------
-- Backfill primary address from legacy columns (non-destructive)
-- ---------------------------------------------------------------------------

INSERT INTO public.addresses (
  owner_type, owner_id, label, is_primary,
  short_address, building_number, additional_number,
  country_id, city_id, latitude, longitude,
  region, region_en, district, district_en,
  street_name, street_name_en, address, address_en,
  source, created_by
)
SELECT 'business', b.id, 'main', true,
       b.national_id, b.building_number, b.additional_number,
       b.country_id, b.city_id, b.latitude, b.longitude,
       b.region, b.region_en, b.district, b.district_en,
       b.street_name, b.street_name_en, b.address, b.address_en,
       'import', b.user_id
  FROM public.businesses b
 WHERE COALESCE(b.address, b.region, b.district, b.street_name, b.national_id) IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.addresses a
      WHERE a.owner_type = 'business' AND a.owner_id = b.id
   );

INSERT INTO public.addresses (
  owner_type, owner_id, label, is_primary,
  short_address, building_number, additional_number,
  country_id, city_id, latitude, longitude,
  region, district, street_name, address,
  source
)
SELECT 'branch', br.id, COALESCE(br.name_ar, 'branch'), br.is_main,
       br.national_id, br.building_number, br.additional_number,
       br.country_id, br.city_id, br.latitude, br.longitude,
       br.region, br.district, br.street_name, br.address,
       'import'
  FROM public.business_branches br
 WHERE COALESCE(br.address, br.region, br.district, br.street_name, br.national_id) IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.addresses a
      WHERE a.owner_type = 'branch' AND a.owner_id = br.id
   );

-- profiles backfill: only if the profiles table actually has address-ish columns.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'address'
  ) THEN
    EXECUTE $sql$
      INSERT INTO public.addresses (
        owner_type, owner_id, label, is_primary,
        country_id, city_id, region, district, address, source
      )
      SELECT 'profile', p.user_id, 'main', true,
             p.country_id, p.city_id, p.region, p.district, p.address, 'import'
        FROM public.profiles p
       WHERE COALESCE(p.address, p.region, p.district) IS NOT NULL
         AND p.user_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM public.addresses a
            WHERE a.owner_type = 'profile' AND a.owner_id = p.user_id
         );
    $sql$;
  END IF;
END$$;
