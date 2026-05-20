
-- ============================================================
-- Client Sites Phase 2.2 — Site identity, type, owner, visibility, QR fields
-- Additive & backward-compatible.
-- ============================================================

-- 1. Sequence + helper
CREATE SEQUENCE IF NOT EXISTS public.client_sites_ref_seq START 100000;

CREATE OR REPLACE FUNCTION public.generate_client_site_ref()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public'
AS $$
DECLARE
  v_year text := to_char(now() AT TIME ZONE 'UTC', 'YYYY');
  v_n    bigint := nextval('public.client_sites_ref_seq');
BEGIN
  RETURN 'STE-' || v_year || '-' || lpad(v_n::text, 6, '0');
END;
$$;

-- 2. Add new columns (nullable / default-safe)
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS site_ref        text,
  ADD COLUMN IF NOT EXISTS site_name       text,
  ADD COLUMN IF NOT EXISTS site_type       text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS owner_user_id   uuid,
  ADD COLUMN IF NOT EXISTS visibility      text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS qr_token_hash   text,
  ADD COLUMN IF NOT EXISTS qr_enabled      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_revoked_at   timestamptz,
  ADD COLUMN IF NOT EXISTS last_scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS scan_count      integer NOT NULL DEFAULT 0;

-- 3. Backfill (data-only, but bundled here because it's part of the schema bootstrap)
UPDATE public.client_sites
   SET site_ref = public.generate_client_site_ref()
 WHERE site_ref IS NULL;

UPDATE public.client_sites
   SET site_name = label
 WHERE site_name IS NULL;

UPDATE public.client_sites
   SET owner_user_id = client_user_id
 WHERE owner_user_id IS NULL
   AND client_user_id IS NOT NULL;

-- 4. Constraints
ALTER TABLE public.client_sites
  ALTER COLUMN site_ref SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_sites_site_type_check') THEN
    ALTER TABLE public.client_sites
      ADD CONSTRAINT client_sites_site_type_check
      CHECK (site_type IN ('apartment','villa','showroom','office','branch','warehouse','project','commercial','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_sites_visibility_check') THEN
    ALTER TABLE public.client_sites
      ADD CONSTRAINT client_sites_visibility_check
      CHECK (visibility IN ('private','shared_by_qr','provider_invited','public_limited'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_sites_scan_count_nonneg') THEN
    ALTER TABLE public.client_sites
      ADD CONSTRAINT client_sites_scan_count_nonneg CHECK (scan_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_sites_site_ref_format') THEN
    ALTER TABLE public.client_sites
      ADD CONSTRAINT client_sites_site_ref_format
      CHECK (site_ref ~ '^STE-[0-9]{4}-[0-9]{6}$');
  END IF;
END $$;

-- 5. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_sites_site_ref      ON public.client_sites (site_ref);
CREATE        INDEX IF NOT EXISTS idx_client_sites_owner_user   ON public.client_sites (owner_user_id) WHERE owner_user_id IS NOT NULL;
CREATE        INDEX IF NOT EXISTS idx_client_sites_site_type    ON public.client_sites (site_type);
CREATE        INDEX IF NOT EXISTS idx_client_sites_visibility   ON public.client_sites (visibility);
CREATE        INDEX IF NOT EXISTS idx_client_sites_qr_token     ON public.client_sites (qr_token_hash) WHERE qr_token_hash IS NOT NULL;

-- 6. Triggers — auto-assign site_ref on INSERT, prevent changes on UPDATE
CREATE OR REPLACE FUNCTION public.client_sites_set_ref_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.site_ref IS NULL OR btrim(NEW.site_ref) = '' THEN
    NEW.site_ref := public.generate_client_site_ref();
  END IF;
  IF NEW.site_name IS NULL OR btrim(NEW.site_name) = '' THEN
    NEW.site_name := NEW.label;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.client_sites_guard_ref_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.site_ref IS DISTINCT FROM OLD.site_ref THEN
    RAISE EXCEPTION 'SITE_REF_IMMUTABLE' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_client_sites_set_ref ON public.client_sites;
CREATE TRIGGER trg_client_sites_set_ref
  BEFORE INSERT ON public.client_sites
  FOR EACH ROW EXECUTE FUNCTION public.client_sites_set_ref_before_insert();

DROP TRIGGER IF EXISTS trg_client_sites_guard_ref ON public.client_sites;
CREATE TRIGGER trg_client_sites_guard_ref
  BEFORE UPDATE ON public.client_sites
  FOR EACH ROW EXECUTE FUNCTION public.client_sites_guard_ref_before_update();

-- 7. Snapshot helper — add safe new fields (does NOT touch existing snapshots)
CREATE OR REPLACE FUNCTION public.build_execution_address_snapshot(_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_s public.client_sites%ROWTYPE;
BEGIN
  IF _site_id IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_s FROM public.client_sites WHERE id = _site_id;
  IF v_s.id IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_SITE:SITE_NOT_FOUND';
  END IF;

  RETURN jsonb_build_object(
    'site_id',       v_s.id,
    'site_ref',      v_s.site_ref,
    'site_name',     v_s.site_name,
    'site_type',     v_s.site_type,
    'label',         v_s.label,
    'contact_name',  v_s.contact_name,
    'contact_phone', v_s.contact_phone,
    'city_id',       v_s.city_id,
    'city_name',     v_s.city_name,
    'district',      v_s.district,
    'address_line1', v_s.address_line1,
    'address_line2', v_s.address_line2,
    'map_url',       v_s.map_url,
    'latitude',      v_s.latitude,
    'longitude',     v_s.longitude,
    'access_notes',  v_s.access_notes,
    'captured_at',   now()
  );
END;
$$;

-- 8. list_client_sites_for_contract — drop & recreate to add safe new fields
DROP FUNCTION IF EXISTS public.list_client_sites_for_contract(uuid, uuid);

CREATE OR REPLACE FUNCTION public.list_client_sites_for_contract(_business_id uuid, _client_user_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
  id uuid, label text, site_ref text, site_name text, site_type text,
  client_user_id uuid, contact_name text, contact_phone text,
  city_id uuid, city_name text, district text,
  address_line1 text, address_line2 text, map_url text,
  latitude numeric, longitude numeric, access_notes text, is_default boolean
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.is_business_owner_or_manager(v_uid, _business_id)
    OR public.has_role(v_uid,'admin')
    OR public.has_role(v_uid,'super_admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT cs.id, cs.label, cs.site_ref, cs.site_name, cs.site_type,
           cs.client_user_id, cs.contact_name, cs.contact_phone,
           cs.city_id, cs.city_name, cs.district,
           cs.address_line1, cs.address_line2, cs.map_url,
           cs.latitude, cs.longitude, cs.access_notes, cs.is_default
    FROM public.client_sites cs
    WHERE cs.business_id = _business_id
      AND cs.archived_at IS NULL
      AND (_client_user_id IS NULL OR cs.client_user_id = _client_user_id)
    ORDER BY cs.is_default DESC, cs.created_at DESC;
END;
$$;

-- 9. create_client_site — accept + return site_name / site_type / owner_user_id / visibility
CREATE OR REPLACE FUNCTION public.create_client_site(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_business_id uuid;
  v_label text;
  v_address_line1 text;
  v_lat numeric;
  v_lng numeric;
  v_map_url text;
  v_site_type text;
  v_visibility text;
  v_new_id uuid;
  v_row public.client_sites;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  v_business_id := nullif(_payload->>'business_id','')::uuid;
  v_label := btrim(coalesce(_payload->>'label',''));
  v_address_line1 := btrim(coalesce(_payload->>'address_line1',''));

  IF v_business_id IS NULL THEN RAISE EXCEPTION 'BUSINESS_ID_REQUIRED' USING ERRCODE = '22023'; END IF;
  IF v_label = ''        THEN RAISE EXCEPTION 'LABEL_REQUIRED'       USING ERRCODE = '22023'; END IF;
  IF v_address_line1 = ''THEN RAISE EXCEPTION 'ADDRESS_REQUIRED'     USING ERRCODE = '22023'; END IF;

  IF NOT (
    public.is_business_owner_or_manager(v_uid, v_business_id)
    OR public.has_role(v_uid,'admin')
    OR public.has_role(v_uid,'super_admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  v_lat := nullif(_payload->>'latitude','')::numeric;
  v_lng := nullif(_payload->>'longitude','')::numeric;
  IF v_lat IS NOT NULL AND (v_lat < -90 OR v_lat > 90)   THEN RAISE EXCEPTION 'INVALID_LATITUDE'  USING ERRCODE = '22023'; END IF;
  IF v_lng IS NOT NULL AND (v_lng < -180 OR v_lng > 180) THEN RAISE EXCEPTION 'INVALID_LONGITUDE' USING ERRCODE = '22023'; END IF;

  v_map_url := nullif(_payload->>'map_url','');
  IF v_map_url IS NOT NULL AND v_map_url !~* '^https?://' THEN
    RAISE EXCEPTION 'INVALID_MAP_URL' USING ERRCODE = '22023';
  END IF;

  v_site_type := coalesce(nullif(btrim(coalesce(_payload->>'site_type','')),''),'other');
  IF v_site_type NOT IN ('apartment','villa','showroom','office','branch','warehouse','project','commercial','other') THEN
    RAISE EXCEPTION 'INVALID_SITE_TYPE' USING ERRCODE = '22023';
  END IF;

  v_visibility := coalesce(nullif(btrim(coalesce(_payload->>'visibility','')),''),'private');
  IF v_visibility NOT IN ('private','shared_by_qr','provider_invited','public_limited') THEN
    RAISE EXCEPTION 'INVALID_VISIBILITY' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.client_sites (
    client_user_id, business_id, label, site_name, site_type, owner_user_id, visibility,
    contact_name, contact_phone,
    city_id, city_name, district, address_line1, address_line2,
    map_url, latitude, longitude, access_notes, is_default, created_by
  ) VALUES (
    nullif(_payload->>'client_user_id','')::uuid,
    v_business_id,
    v_label,
    nullif(btrim(coalesce(_payload->>'site_name','')),''),
    v_site_type,
    nullif(_payload->>'owner_user_id','')::uuid,
    v_visibility,
    nullif(btrim(coalesce(_payload->>'contact_name','')),''),
    nullif(btrim(coalesce(_payload->>'contact_phone','')),''),
    nullif(_payload->>'city_id','')::uuid,
    nullif(btrim(coalesce(_payload->>'city_name','')),''),
    nullif(btrim(coalesce(_payload->>'district','')),''),
    v_address_line1,
    nullif(btrim(coalesce(_payload->>'address_line2','')),''),
    v_map_url,
    v_lat, v_lng,
    nullif(btrim(coalesce(_payload->>'access_notes','')),''),
    coalesce((_payload->>'is_default')::boolean, false),
    v_uid
  ) RETURNING id INTO v_new_id;

  SELECT * INTO v_row FROM public.client_sites WHERE id = v_new_id;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'business_id', v_row.business_id,
    'client_user_id', v_row.client_user_id,
    'site_ref', v_row.site_ref,
    'site_name', v_row.site_name,
    'site_type', v_row.site_type,
    'visibility', v_row.visibility,
    'label', v_row.label,
    'contact_name', v_row.contact_name,
    'contact_phone', v_row.contact_phone,
    'city_id', v_row.city_id,
    'city_name', v_row.city_name,
    'district', v_row.district,
    'address_line1', v_row.address_line1,
    'address_line2', v_row.address_line2,
    'map_url', v_row.map_url,
    'latitude', v_row.latitude,
    'longitude', v_row.longitude,
    'access_notes', v_row.access_notes,
    'is_default', v_row.is_default,
    'created_at', v_row.created_at
  );
END;
$$;

-- 10. update_client_site — accept site_name/site_type/visibility/owner_user_id; block site_ref + qr fields
CREATE OR REPLACE FUNCTION public.update_client_site(_site_id uuid, _patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.client_sites;
  v_lat numeric;
  v_lng numeric;
  v_map_url text;
  v_site_type text;
  v_visibility text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.client_sites WHERE id = _site_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = '02000'; END IF;
  IF v_row.archived_at IS NOT NULL THEN RAISE EXCEPTION 'SITE_ARCHIVED' USING ERRCODE = '22023'; END IF;

  IF NOT (
    public.is_business_owner_or_manager(v_uid, v_row.business_id)
    OR (v_row.client_user_id IS NOT NULL AND v_row.client_user_id = v_uid)
    OR (v_row.owner_user_id  IS NOT NULL AND v_row.owner_user_id  = v_uid)
    OR public.has_role(v_uid,'admin')
    OR public.has_role(v_uid,'super_admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Block forbidden fields outright
  IF _patch ? 'business_id' OR _patch ? 'created_by' OR _patch ? 'archived_at'
     OR _patch ? 'site_ref'
     OR _patch ? 'qr_token_hash' OR _patch ? 'qr_enabled' OR _patch ? 'qr_revoked_at'
     OR _patch ? 'last_scanned_at' OR _patch ? 'scan_count' THEN
    RAISE EXCEPTION 'FORBIDDEN_FIELD' USING ERRCODE = '42501';
  END IF;

  IF (_patch ? 'client_user_id' OR _patch ? 'owner_user_id') AND NOT (
    public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
    OR public.is_business_owner_or_manager(v_uid, v_row.business_id)
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN_FIELD_OWNER' USING ERRCODE = '42501';
  END IF;

  IF _patch ? 'latitude' THEN
    v_lat := nullif(_patch->>'latitude','')::numeric;
    IF v_lat IS NOT NULL AND (v_lat < -90 OR v_lat > 90) THEN
      RAISE EXCEPTION 'INVALID_LATITUDE' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF _patch ? 'longitude' THEN
    v_lng := nullif(_patch->>'longitude','')::numeric;
    IF v_lng IS NOT NULL AND (v_lng < -180 OR v_lng > 180) THEN
      RAISE EXCEPTION 'INVALID_LONGITUDE' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF _patch ? 'map_url' THEN
    v_map_url := nullif(_patch->>'map_url','');
    IF v_map_url IS NOT NULL AND v_map_url !~* '^https?://' THEN
      RAISE EXCEPTION 'INVALID_MAP_URL' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF _patch ? 'site_type' THEN
    v_site_type := btrim(coalesce(_patch->>'site_type',''));
    IF v_site_type NOT IN ('apartment','villa','showroom','office','branch','warehouse','project','commercial','other') THEN
      RAISE EXCEPTION 'INVALID_SITE_TYPE' USING ERRCODE = '22023';
    END IF;
  END IF;
  IF _patch ? 'visibility' THEN
    v_visibility := btrim(coalesce(_patch->>'visibility',''));
    IF v_visibility NOT IN ('private','shared_by_qr','provider_invited','public_limited') THEN
      RAISE EXCEPTION 'INVALID_VISIBILITY' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.client_sites SET
    label = CASE WHEN _patch ? 'label' THEN btrim(coalesce(_patch->>'label', label)) ELSE label END,
    site_name = CASE WHEN _patch ? 'site_name' THEN nullif(btrim(coalesce(_patch->>'site_name','')),'') ELSE site_name END,
    site_type = CASE WHEN _patch ? 'site_type' THEN btrim(_patch->>'site_type') ELSE site_type END,
    visibility = CASE WHEN _patch ? 'visibility' THEN btrim(_patch->>'visibility') ELSE visibility END,
    contact_name = CASE WHEN _patch ? 'contact_name' THEN nullif(btrim(coalesce(_patch->>'contact_name','')),'') ELSE contact_name END,
    contact_phone = CASE WHEN _patch ? 'contact_phone' THEN nullif(btrim(coalesce(_patch->>'contact_phone','')),'') ELSE contact_phone END,
    city_id = CASE WHEN _patch ? 'city_id' THEN nullif(_patch->>'city_id','')::uuid ELSE city_id END,
    city_name = CASE WHEN _patch ? 'city_name' THEN nullif(btrim(coalesce(_patch->>'city_name','')),'') ELSE city_name END,
    district = CASE WHEN _patch ? 'district' THEN nullif(btrim(coalesce(_patch->>'district','')),'') ELSE district END,
    address_line1 = CASE WHEN _patch ? 'address_line1' THEN btrim(coalesce(_patch->>'address_line1', address_line1)) ELSE address_line1 END,
    address_line2 = CASE WHEN _patch ? 'address_line2' THEN nullif(btrim(coalesce(_patch->>'address_line2','')),'') ELSE address_line2 END,
    map_url = CASE WHEN _patch ? 'map_url' THEN nullif(_patch->>'map_url','') ELSE map_url END,
    latitude = CASE WHEN _patch ? 'latitude' THEN nullif(_patch->>'latitude','')::numeric ELSE latitude END,
    longitude = CASE WHEN _patch ? 'longitude' THEN nullif(_patch->>'longitude','')::numeric ELSE longitude END,
    access_notes = CASE WHEN _patch ? 'access_notes' THEN nullif(btrim(coalesce(_patch->>'access_notes','')),'') ELSE access_notes END,
    is_default = CASE WHEN _patch ? 'is_default' THEN coalesce((_patch->>'is_default')::boolean, is_default) ELSE is_default END,
    client_user_id = CASE
      WHEN _patch ? 'client_user_id' AND (
        public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
        OR public.is_business_owner_or_manager(v_uid, v_row.business_id)
      ) THEN nullif(_patch->>'client_user_id','')::uuid
      ELSE client_user_id
    END,
    owner_user_id = CASE
      WHEN _patch ? 'owner_user_id' AND (
        public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
        OR public.is_business_owner_or_manager(v_uid, v_row.business_id)
      ) THEN nullif(_patch->>'owner_user_id','')::uuid
      ELSE owner_user_id
    END
  WHERE id = _site_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'business_id', v_row.business_id,
    'client_user_id', v_row.client_user_id,
    'site_ref', v_row.site_ref,
    'site_name', v_row.site_name,
    'site_type', v_row.site_type,
    'visibility', v_row.visibility,
    'label', v_row.label,
    'contact_name', v_row.contact_name,
    'contact_phone', v_row.contact_phone,
    'city_id', v_row.city_id,
    'city_name', v_row.city_name,
    'district', v_row.district,
    'address_line1', v_row.address_line1,
    'address_line2', v_row.address_line2,
    'map_url', v_row.map_url,
    'latitude', v_row.latitude,
    'longitude', v_row.longitude,
    'access_notes', v_row.access_notes,
    'is_default', v_row.is_default,
    'updated_at', v_row.updated_at
  );
END;
$$;
