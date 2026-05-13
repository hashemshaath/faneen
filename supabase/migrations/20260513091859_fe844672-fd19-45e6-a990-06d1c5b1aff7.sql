
-- Phase 5C.1 — Client Sites foundation (table + RLS + safe RPCs)

-- 1. Table -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NULL,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label text NOT NULL,
  contact_name text NULL,
  contact_phone text NULL,
  city_id uuid NULL REFERENCES public.cities(id) ON DELETE SET NULL,
  city_name text NULL,
  district text NULL,
  address_line1 text NOT NULL,
  address_line2 text NULL,
  map_url text NULL,
  latitude numeric NULL,
  longitude numeric NULL,
  access_notes text NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  CONSTRAINT client_sites_label_nonempty CHECK (length(btrim(label)) > 0),
  CONSTRAINT client_sites_addr1_nonempty CHECK (length(btrim(address_line1)) > 0),
  CONSTRAINT client_sites_lat_range CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
  CONSTRAINT client_sites_lng_range CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_sites_client_user ON public.client_sites(client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_sites_business ON public.client_sites(business_id);
CREATE INDEX IF NOT EXISTS idx_client_sites_business_client ON public.client_sites(business_id, client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_sites_archived ON public.client_sites(archived_at);

-- Only one default per (business, client) among non-archived rows
CREATE UNIQUE INDEX IF NOT EXISTS uq_client_sites_default_per_client
  ON public.client_sites(business_id, client_user_id)
  WHERE is_default = true AND archived_at IS NULL AND client_user_id IS NOT NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_client_sites_updated_at ON public.client_sites;
CREATE TRIGGER trg_client_sites_updated_at
  BEFORE UPDATE ON public.client_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. RLS ---------------------------------------------------------------
ALTER TABLE public.client_sites ENABLE ROW LEVEL SECURITY;

-- SELECT: client (own), business owner/manager (scoped), admins
CREATE POLICY "client_sites_select_client_own"
  ON public.client_sites FOR SELECT
  TO authenticated
  USING (client_user_id IS NOT NULL AND client_user_id = auth.uid());

CREATE POLICY "client_sites_select_business_manager"
  ON public.client_sites FOR SELECT
  TO authenticated
  USING (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "client_sites_select_admin"
  ON public.client_sites FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- INSERT: business owner/manager for own business; or admin
CREATE POLICY "client_sites_insert_business_manager"
  ON public.client_sites FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.is_business_owner_or_manager(auth.uid(), business_id)
  );

CREATE POLICY "client_sites_insert_admin"
  ON public.client_sites FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
  );

-- UPDATE: business manager (non-archived), client (own non-archived), admin
CREATE POLICY "client_sites_update_business_manager"
  ON public.client_sites FOR UPDATE
  TO authenticated
  USING (archived_at IS NULL AND public.is_business_owner_or_manager(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));

CREATE POLICY "client_sites_update_client_own"
  ON public.client_sites FOR UPDATE
  TO authenticated
  USING (archived_at IS NULL AND client_user_id IS NOT NULL AND client_user_id = auth.uid())
  WITH CHECK (client_user_id = auth.uid());

CREATE POLICY "client_sites_update_admin"
  ON public.client_sites FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- No DELETE policy (intentional). Use archive_client_site RPC.

-- 3. Safe RPCs ---------------------------------------------------------

-- Helpers (inline)
-- access check used inside RPCs
CREATE OR REPLACE FUNCTION public._can_manage_client_site(_site_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_sites cs
    WHERE cs.id = _site_id
      AND (
        public.is_business_owner_or_manager(auth.uid(), cs.business_id)
        OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'super_admin')
      )
  );
$$;

REVOKE ALL ON FUNCTION public._can_manage_client_site(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._can_manage_client_site(uuid) TO authenticated, service_role;

-- create_client_site
CREATE OR REPLACE FUNCTION public.create_client_site(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_business_id uuid;
  v_label text;
  v_address_line1 text;
  v_lat numeric;
  v_lng numeric;
  v_map_url text;
  v_new_id uuid;
  v_row public.client_sites;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  v_business_id := nullif(_payload->>'business_id','')::uuid;
  v_label := btrim(coalesce(_payload->>'label',''));
  v_address_line1 := btrim(coalesce(_payload->>'address_line1',''));

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'BUSINESS_ID_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF v_label = '' THEN
    RAISE EXCEPTION 'LABEL_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF v_address_line1 = '' THEN
    RAISE EXCEPTION 'ADDRESS_REQUIRED' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_business_owner_or_manager(v_uid, v_business_id)
    OR public.has_role(v_uid,'admin')
    OR public.has_role(v_uid,'super_admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  v_lat := nullif(_payload->>'latitude','')::numeric;
  v_lng := nullif(_payload->>'longitude','')::numeric;
  IF v_lat IS NOT NULL AND (v_lat < -90 OR v_lat > 90) THEN
    RAISE EXCEPTION 'INVALID_LATITUDE' USING ERRCODE = '22023';
  END IF;
  IF v_lng IS NOT NULL AND (v_lng < -180 OR v_lng > 180) THEN
    RAISE EXCEPTION 'INVALID_LONGITUDE' USING ERRCODE = '22023';
  END IF;

  v_map_url := nullif(_payload->>'map_url','');
  IF v_map_url IS NOT NULL AND v_map_url !~* '^https?://' THEN
    RAISE EXCEPTION 'INVALID_MAP_URL' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.client_sites (
    client_user_id, business_id, label, contact_name, contact_phone,
    city_id, city_name, district, address_line1, address_line2,
    map_url, latitude, longitude, access_notes, is_default, created_by
  ) VALUES (
    nullif(_payload->>'client_user_id','')::uuid,
    v_business_id,
    v_label,
    nullif(btrim(coalesce(_payload->>'contact_name','')),''),
    nullif(btrim(coalesce(_payload->>'contact_phone','')),''),
    nullif(_payload->>'city_id','')::uuid,
    nullif(btrim(coalesce(_payload->>'city_name','')),''),
    nullif(btrim(coalesce(_payload->>'district','')),''),
    v_address_line1,
    nullif(btrim(coalesce(_payload->>'address_line2','')),''),
    v_map_url,
    v_lat,
    v_lng,
    nullif(btrim(coalesce(_payload->>'access_notes','')),''),
    coalesce((_payload->>'is_default')::boolean, false),
    v_uid
  ) RETURNING id INTO v_new_id;

  SELECT * INTO v_row FROM public.client_sites WHERE id = v_new_id;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'business_id', v_row.business_id,
    'client_user_id', v_row.client_user_id,
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

REVOKE ALL ON FUNCTION public.create_client_site(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_client_site(jsonb) TO authenticated, service_role;

-- update_client_site (whitelist patch)
CREATE OR REPLACE FUNCTION public.update_client_site(_site_id uuid, _patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.client_sites;
  v_lat numeric;
  v_lng numeric;
  v_map_url text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.client_sites WHERE id = _site_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = '02000';
  END IF;
  IF v_row.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'SITE_ARCHIVED' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    public.is_business_owner_or_manager(v_uid, v_row.business_id)
    OR (v_row.client_user_id IS NOT NULL AND v_row.client_user_id = v_uid)
    OR public.has_role(v_uid,'admin')
    OR public.has_role(v_uid,'super_admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Block forbidden keys (silently ignore by reading only whitelist)
  IF _patch ? 'business_id' OR _patch ? 'created_by' OR _patch ? 'archived_at' THEN
    RAISE EXCEPTION 'FORBIDDEN_FIELD' USING ERRCODE = '42501';
  END IF;
  IF _patch ? 'client_user_id' AND NOT (
    public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN_FIELD_CLIENT_USER' USING ERRCODE = '42501';
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

  UPDATE public.client_sites SET
    label = CASE WHEN _patch ? 'label' THEN btrim(coalesce(_patch->>'label', label)) ELSE label END,
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
      WHEN _patch ? 'client_user_id' AND (public.has_role(v_uid,'admin') OR public.has_role(v_uid,'super_admin'))
        THEN nullif(_patch->>'client_user_id','')::uuid
      ELSE client_user_id
    END
  WHERE id = _site_id
  RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'id', v_row.id,
    'business_id', v_row.business_id,
    'client_user_id', v_row.client_user_id,
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

REVOKE ALL ON FUNCTION public.update_client_site(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_client_site(uuid, jsonb) TO authenticated, service_role;

-- archive_client_site
CREATE OR REPLACE FUNCTION public.archive_client_site(_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.client_sites;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.client_sites WHERE id = _site_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = '02000';
  END IF;

  IF NOT (
    public.is_business_owner_or_manager(v_uid, v_row.business_id)
    OR public.has_role(v_uid,'admin')
    OR public.has_role(v_uid,'super_admin')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  UPDATE public.client_sites
    SET archived_at = now(), is_default = false
    WHERE id = _site_id AND archived_at IS NULL;

  RETURN jsonb_build_object('archived', true, 'id', _site_id);
END;
$$;

REVOKE ALL ON FUNCTION public.archive_client_site(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.archive_client_site(uuid) TO authenticated, service_role;

-- list_client_sites_for_contract
CREATE OR REPLACE FUNCTION public.list_client_sites_for_contract(
  _business_id uuid,
  _client_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  label text,
  client_user_id uuid,
  contact_name text,
  contact_phone text,
  city_id uuid,
  city_name text,
  district text,
  address_line1 text,
  address_line2 text,
  map_url text,
  latitude numeric,
  longitude numeric,
  access_notes text,
  is_default boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
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
    SELECT cs.id, cs.label, cs.client_user_id, cs.contact_name, cs.contact_phone,
           cs.city_id, cs.city_name, cs.district, cs.address_line1, cs.address_line2,
           cs.map_url, cs.latitude, cs.longitude, cs.access_notes, cs.is_default
    FROM public.client_sites cs
    WHERE cs.business_id = _business_id
      AND cs.archived_at IS NULL
      AND (_client_user_id IS NULL OR cs.client_user_id = _client_user_id)
    ORDER BY cs.is_default DESC, cs.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_client_sites_for_contract(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_client_sites_for_contract(uuid, uuid) TO authenticated, service_role;
