
-- Extend client_sites with full Saudi National Address fields and refresh RPCs.

ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS short_address      text,
  ADD COLUMN IF NOT EXISTS region             text,
  ADD COLUMN IF NOT EXISTS region_en          text,
  ADD COLUMN IF NOT EXISTS district_en        text,
  ADD COLUMN IF NOT EXISTS street_name        text,
  ADD COLUMN IF NOT EXISTS street_name_en     text,
  ADD COLUMN IF NOT EXISTS building_number    text,
  ADD COLUMN IF NOT EXISTS additional_number  text,
  ADD COLUMN IF NOT EXISTS post_code          text,
  ADD COLUMN IF NOT EXISTS address_en         text;

CREATE OR REPLACE FUNCTION public.create_client_site(_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_short text;
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

  v_short := upper(regexp_replace(coalesce(_payload->>'short_address',''), '\s+', '', 'g'));
  IF v_short <> '' AND v_short !~ '^[A-Z]{4}[0-9]{4}$' THEN
    RAISE EXCEPTION 'INVALID_SHORT_ADDRESS' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.client_sites (
    client_user_id, business_id, label, site_name, site_type, owner_user_id, visibility,
    contact_name, contact_phone,
    city_id, city_name, district, district_en,
    region, region_en, street_name, street_name_en,
    building_number, additional_number, post_code, short_address, address_en,
    address_line1, address_line2,
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
    nullif(btrim(coalesce(_payload->>'district_en','')),''),
    nullif(btrim(coalesce(_payload->>'region','')),''),
    nullif(btrim(coalesce(_payload->>'region_en','')),''),
    nullif(btrim(coalesce(_payload->>'street_name','')),''),
    nullif(btrim(coalesce(_payload->>'street_name_en','')),''),
    nullif(btrim(coalesce(_payload->>'building_number','')),''),
    nullif(btrim(coalesce(_payload->>'additional_number','')),''),
    nullif(btrim(coalesce(_payload->>'post_code','')),''),
    nullif(v_short,''),
    nullif(btrim(coalesce(_payload->>'address_en','')),''),
    v_address_line1,
    nullif(btrim(coalesce(_payload->>'address_line2','')),''),
    v_map_url,
    v_lat, v_lng,
    nullif(btrim(coalesce(_payload->>'access_notes','')),''),
    coalesce((_payload->>'is_default')::boolean, false),
    v_uid
  ) RETURNING id INTO v_new_id;

  SELECT * INTO v_row FROM public.client_sites WHERE id = v_new_id;
  RETURN to_jsonb(v_row);
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_client_site(_site_id uuid, _patch jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.client_sites;
  v_lat numeric;
  v_lng numeric;
  v_map_url text;
  v_site_type text;
  v_visibility text;
  v_short text;
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
  IF _patch ? 'short_address' THEN
    v_short := upper(regexp_replace(coalesce(_patch->>'short_address',''), '\s+', '', 'g'));
    IF v_short <> '' AND v_short !~ '^[A-Z]{4}[0-9]{4}$' THEN
      RAISE EXCEPTION 'INVALID_SHORT_ADDRESS' USING ERRCODE = '22023';
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
    district_en = CASE WHEN _patch ? 'district_en' THEN nullif(btrim(coalesce(_patch->>'district_en','')),'') ELSE district_en END,
    region = CASE WHEN _patch ? 'region' THEN nullif(btrim(coalesce(_patch->>'region','')),'') ELSE region END,
    region_en = CASE WHEN _patch ? 'region_en' THEN nullif(btrim(coalesce(_patch->>'region_en','')),'') ELSE region_en END,
    street_name = CASE WHEN _patch ? 'street_name' THEN nullif(btrim(coalesce(_patch->>'street_name','')),'') ELSE street_name END,
    street_name_en = CASE WHEN _patch ? 'street_name_en' THEN nullif(btrim(coalesce(_patch->>'street_name_en','')),'') ELSE street_name_en END,
    building_number = CASE WHEN _patch ? 'building_number' THEN nullif(btrim(coalesce(_patch->>'building_number','')),'') ELSE building_number END,
    additional_number = CASE WHEN _patch ? 'additional_number' THEN nullif(btrim(coalesce(_patch->>'additional_number','')),'') ELSE additional_number END,
    post_code = CASE WHEN _patch ? 'post_code' THEN nullif(btrim(coalesce(_patch->>'post_code','')),'') ELSE post_code END,
    short_address = CASE WHEN _patch ? 'short_address' THEN nullif(v_short,'') ELSE short_address END,
    address_en = CASE WHEN _patch ? 'address_en' THEN nullif(btrim(coalesce(_patch->>'address_en','')),'') ELSE address_en END,
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

  RETURN to_jsonb(v_row);
END;
$function$;
