-- ============================================================================
-- ADDRESS-GOVERNANCE-1 — Central addresses governance + districts catalog
-- ============================================================================

-- 1) Extend addresses ---------------------------------------------------------
ALTER TABLE public.addresses
  ADD COLUMN IF NOT EXISTS address_type            text NOT NULL DEFAULT 'primary',
  ADD COLUMN IF NOT EXISTS country_code            text NOT NULL DEFAULT 'SA',
  ADD COLUMN IF NOT EXISTS national_address_source text,
  ADD COLUMN IF NOT EXISTS national_address_raw    jsonb,
  ADD COLUMN IF NOT EXISTS updated_by              uuid,
  ADD COLUMN IF NOT EXISTS is_verified             boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'addresses_address_type_check') THEN
    ALTER TABLE public.addresses
      ADD CONSTRAINT addresses_address_type_check
      CHECK (address_type IN ('primary','billing','shipping','project_site','branch','national_address'));
  END IF;
END$$;

DROP INDEX IF EXISTS addresses_one_primary_per_owner_idx;
CREATE UNIQUE INDEX IF NOT EXISTS addresses_one_primary_per_owner_type_idx
  ON public.addresses (owner_type, owner_id, address_type) WHERE is_primary;
CREATE INDEX IF NOT EXISTS addresses_owner_type_addr_type_idx
  ON public.addresses (owner_type, owner_id, address_type);

-- 2) Districts ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.districts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code  text NOT NULL DEFAULT 'SA',
  region        text NOT NULL,
  city          text NOT NULL,
  district_ar   text NOT NULL,
  district_en   text,
  city_ar       text,
  city_en       text,
  region_ar     text,
  region_en     text,
  is_active     boolean NOT NULL DEFAULT true,
  source        text NOT NULL DEFAULT 'manual',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.districts TO anon;
GRANT SELECT ON public.districts TO authenticated;
GRANT ALL    ON public.districts TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS districts_unique_triplet_idx
  ON public.districts (country_code, lower(region), lower(city), lower(district_ar));
CREATE INDEX IF NOT EXISTS districts_region_city_idx ON public.districts (region, city) WHERE is_active;
CREATE INDEX IF NOT EXISTS districts_city_idx        ON public.districts (city) WHERE is_active;
CREATE INDEX IF NOT EXISTS districts_lower_district_en_idx
  ON public.districts (lower(district_en)) WHERE district_en IS NOT NULL;

DO $$
BEGIN
  PERFORM 1 FROM pg_extension WHERE extname = 'pg_trgm';
  IF FOUND THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS districts_trgm_district_ar_idx ON public.districts USING gin (district_ar gin_trgm_ops)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS districts_trgm_district_en_idx ON public.districts USING gin (district_en gin_trgm_ops)';
  END IF;
END$$;

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "districts public read" ON public.districts;
CREATE POLICY "districts public read"
  ON public.districts FOR SELECT TO anon, authenticated USING (is_active);

DROP POLICY IF EXISTS "districts admin write" ON public.districts;
CREATE POLICY "districts admin write"
  ON public.districts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) ensure_district() upsert helper -----------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_district(
  _country_code text, _region text, _city text,
  _district_ar text, _district_en text DEFAULT NULL,
  _region_en text DEFAULT NULL, _city_en text DEFAULT NULL,
  _source text DEFAULT 'spl'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF _district_ar IS NULL OR length(trim(_district_ar)) = 0 THEN RETURN NULL; END IF;
  INSERT INTO public.districts (country_code, region, city, district_ar, district_en, city_ar, city_en, region_ar, region_en, source)
  VALUES (COALESCE(_country_code,'SA'), _region, _city, _district_ar, _district_en, _city, _city_en, _region, _region_en, COALESCE(_source,'spl'))
  ON CONFLICT (country_code, lower(region), lower(city), lower(district_ar))
  DO UPDATE SET
    district_en = COALESCE(EXCLUDED.district_en, public.districts.district_en),
    city_en     = COALESCE(EXCLUDED.city_en,     public.districts.city_en),
    region_en   = COALESCE(EXCLUDED.region_en,   public.districts.region_en),
    updated_at  = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END$$;
GRANT EXECUTE ON FUNCTION public.ensure_district(text,text,text,text,text,text,text,text) TO authenticated, service_role;

-- 4) Backfill addresses from existing flat columns ---------------------------
-- Businesses: no postal_code / additional_number columns; skip them.
INSERT INTO public.addresses (
  owner_type, owner_id, address_type, is_primary,
  region, region_en, district, district_en, street_name, street_name_en,
  building_number, short_address, address, address_en, city_id, country_id,
  latitude, longitude, source, country_code
)
SELECT
  'business', b.id, 'national_address', true,
  b.region, b.region_en, b.district, b.district_en, b.street_name, b.street_name_en,
  b.building_number, b.short_address, b.address, b.address_en, b.city_id, b.country_id,
  b.latitude, b.longitude, 'import', 'SA'
FROM public.businesses b
WHERE (b.region IS NOT NULL OR b.district IS NOT NULL OR b.street_name IS NOT NULL
       OR b.address IS NOT NULL OR b.short_address IS NOT NULL OR b.city_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.addresses a
    WHERE a.owner_type='business' AND a.owner_id=b.id
      AND a.address_type='national_address' AND a.is_primary
  );

INSERT INTO public.addresses (
  owner_type, owner_id, address_type, is_primary,
  region, district, street_name, building_number, additional_number,
  post_code, short_address, address, city_id, country_id, source, country_code
)
SELECT
  'profile', p.user_id, 'national_address', true,
  p.region_name, p.district, p.street, p.building_number, p.additional_number,
  p.postal_code, p.short_national_address, p.address_line, p.city_id, p.country_id,
  'import', 'SA'
FROM public.profiles p
WHERE (p.region_name IS NOT NULL OR p.district IS NOT NULL OR p.street IS NOT NULL
       OR p.address_line IS NOT NULL OR p.short_national_address IS NOT NULL
       OR p.city_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.addresses a
    WHERE a.owner_type='profile' AND a.owner_id=p.user_id
      AND a.address_type='national_address' AND a.is_primary
  );

-- 5) Legacy compatibility mirror trigger -------------------------------------
CREATE OR REPLACE FUNCTION public.sync_primary_address_to_legacy()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_primary IS DISTINCT FROM true THEN RETURN NEW; END IF;
  IF NEW.owner_type = 'profile' THEN
    UPDATE public.profiles SET
      short_national_address = COALESCE(NEW.short_address,     short_national_address),
      region_name            = COALESCE(NEW.region,            region_name),
      district               = COALESCE(NEW.district,          district),
      street                 = COALESCE(NEW.street_name,       street),
      building_number        = COALESCE(NEW.building_number,   building_number),
      additional_number      = COALESCE(NEW.additional_number, additional_number),
      postal_code            = COALESCE(NEW.post_code,         postal_code),
      address_line           = COALESCE(NEW.address,           address_line),
      city_id                = COALESCE(NEW.city_id,           city_id),
      country_id             = COALESCE(NEW.country_id,        country_id),
      updated_at             = now()
    WHERE user_id = NEW.owner_id;
  ELSIF NEW.owner_type = 'business' THEN
    UPDATE public.businesses SET
      short_address     = COALESCE(NEW.short_address,     short_address),
      region            = COALESCE(NEW.region,            region),
      region_en         = COALESCE(NEW.region_en,         region_en),
      district          = COALESCE(NEW.district,          district),
      district_en       = COALESCE(NEW.district_en,       district_en),
      street_name       = COALESCE(NEW.street_name,       street_name),
      street_name_en    = COALESCE(NEW.street_name_en,    street_name_en),
      building_number   = COALESCE(NEW.building_number,   building_number),
      address           = COALESCE(NEW.address,           address),
      address_en        = COALESCE(NEW.address_en,        address_en),
      city_id           = COALESCE(NEW.city_id,           city_id),
      country_id        = COALESCE(NEW.country_id,        country_id),
      latitude          = COALESCE(NEW.latitude,          latitude),
      longitude         = COALESCE(NEW.longitude,         longitude),
      updated_at        = now()
    WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS sync_primary_address_to_legacy_trg ON public.addresses;
CREATE TRIGGER sync_primary_address_to_legacy_trg
  AFTER INSERT OR UPDATE OF
    is_primary, short_address, region, region_en, district, district_en,
    street_name, street_name_en, building_number, additional_number,
    post_code, address, address_en, city_id, country_id, latitude, longitude
  ON public.addresses
  FOR EACH ROW EXECUTE FUNCTION public.sync_primary_address_to_legacy();
