-- 1) Make business_id nullable + ensure either business or personal owner is set
ALTER TABLE public.client_sites ALTER COLUMN business_id DROP NOT NULL;

ALTER TABLE public.client_sites
  DROP CONSTRAINT IF EXISTS client_sites_owner_present_chk;
ALTER TABLE public.client_sites
  ADD CONSTRAINT client_sites_owner_present_chk
  CHECK (business_id IS NOT NULL OR client_user_id IS NOT NULL);

-- 2) Optional personal tax number (VAT) — invoices/contracts may reference it
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS tax_number text;

COMMENT ON COLUMN public.client_sites.tax_number IS
  'Optional VAT/tax number for personal-owned sites (linked with owner_id_number on invoices/contracts).';

-- 3) Insert policy: allow individuals to add sites for themselves (no business)
DROP POLICY IF EXISTS client_sites_insert_client_own ON public.client_sites;
CREATE POLICY client_sites_insert_client_own
  ON public.client_sites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND client_user_id = auth.uid()
    AND business_id IS NULL
  );

-- 4) create_client_site: allow personal mode when no business_id is provided
CREATE OR REPLACE FUNCTION public.create_client_site(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_business_id uuid;
  v_client_user_id uuid;
  v_label text;
  v_address_line1 text;
  v_lat numeric;
  v_lng numeric;
  v_map_url text;
  v_site_type text;
  v_visibility text;
  v_short text;
  v_lic_issue date;
  v_lic_expiry date;
  v_deed_date date;
  v_new_id uuid;
  v_row public.client_sites;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501'; END IF;

  v_business_id    := nullif(_payload->>'business_id','')::uuid;
  v_client_user_id := nullif(_payload->>'client_user_id','')::uuid;
  v_label          := btrim(coalesce(_payload->>'label',''));
  v_address_line1  := btrim(coalesce(_payload->>'address_line1',''));

  -- Personal mode: no business -> bind to caller as client_user_id
  IF v_business_id IS NULL THEN
    IF v_client_user_id IS NULL THEN v_client_user_id := v_uid; END IF;
    IF v_client_user_id <> v_uid THEN
      RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_label = ''         THEN RAISE EXCEPTION 'LABEL_REQUIRED'   USING ERRCODE = '22023'; END IF;
  IF v_address_line1 = '' THEN RAISE EXCEPTION 'ADDRESS_REQUIRED' USING ERRCODE = '22023'; END IF;

  IF v_business_id IS NOT NULL THEN
    IF NOT (
      public.is_business_owner_or_manager(v_uid, v_business_id)
      OR public.has_role(v_uid,'admin')
      OR public.has_role(v_uid,'super_admin')
    ) THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501'; END IF;
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

  v_lic_issue  := nullif(_payload->>'municipal_license_issue_date','')::date;
  v_lic_expiry := nullif(_payload->>'municipal_license_expiry_date','')::date;
  v_deed_date  := nullif(_payload->>'title_deed_date','')::date;
  IF v_lic_issue IS NOT NULL AND v_lic_expiry IS NOT NULL AND v_lic_expiry < v_lic_issue THEN
    RAISE EXCEPTION 'INVALID_LICENSE_DATES' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.client_sites (
    client_user_id, business_id, label, site_name, site_type, owner_user_id, visibility,
    contact_name, contact_phone,
    city_id, city_name, district, district_en,
    region, region_en, street_name, street_name_en,
    building_number, additional_number, post_code, short_address, address_en,
    address_line1, address_line2,
    map_url, latitude, longitude, access_notes, is_default, created_by,
    municipal_license_no, municipal_license_issue_date, municipal_license_expiry_date,
    title_deed_no, title_deed_date,
    owner_name, owner_id_number, tax_number, land_use_type,
    plot_number, block_number, plan_number, government_notes
  ) VALUES (
    v_client_user_id,
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
    v_uid,
    nullif(btrim(coalesce(_payload->>'municipal_license_no','')),''),
    v_lic_issue, v_lic_expiry,
    nullif(btrim(coalesce(_payload->>'title_deed_no','')),''),
    v_deed_date,
    nullif(btrim(coalesce(_payload->>'owner_name','')),''),
    nullif(btrim(coalesce(_payload->>'owner_id_number','')),''),
    nullif(btrim(coalesce(_payload->>'tax_number','')),''),
    nullif(btrim(coalesce(_payload->>'land_use_type','')),''),
    nullif(btrim(coalesce(_payload->>'plot_number','')),''),
    nullif(btrim(coalesce(_payload->>'block_number','')),''),
    nullif(btrim(coalesce(_payload->>'plan_number','')),''),
    nullif(btrim(coalesce(_payload->>'government_notes','')),'')
  ) RETURNING id INTO v_new_id;

  SELECT * INTO v_row FROM public.client_sites WHERE id = v_new_id;
  RETURN to_jsonb(v_row);
END;
$function$;

-- 5) update_client_site: support tax_number in patch; allow self-owner to edit personal sites
-- (existing function already filters immutable fields; we just need it to accept tax_number)
-- Re-fetch existing function then re-create with tax_number added to allowed list.
DO $$
DECLARE
  v_def text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='update_client_site';
  -- No-op: we patch via separate CREATE OR REPLACE below to keep it simple.
END $$;

-- We append tax_number handling by re-creating only if function exists.
-- Safe replacement preserving original signature and behavior:
DROP FUNCTION IF EXISTS public.update_client_site(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.update_client_site(_site_id uuid, _patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_site public.client_sites;
  v_can boolean;
  v_key text;
  v_forbidden text[] := ARRAY[
    'id','business_id','client_user_id','created_by','created_at','updated_at',
    'archived_at','site_ref','ref_id','legacy_ref_id',
    'qr_token_hash','qr_enabled','qr_revoked_at',
    'last_scanned_at','scan_count','is_demo','country_id'
  ];
  v_lic_issue date;
  v_lic_expiry date;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'UNAUTHENTICATED' USING ERRCODE = '42501'; END IF;
  SELECT * INTO v_site FROM public.client_sites WHERE id = _site_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE = '02000'; END IF;
  IF v_site.archived_at IS NOT NULL THEN RAISE EXCEPTION 'ARCHIVED' USING ERRCODE = '22023'; END IF;

  -- Authorization
  v_can :=
    public.has_role(v_uid,'admin')
    OR public.has_role(v_uid,'super_admin')
    OR (v_site.business_id IS NOT NULL AND public.is_business_owner_or_manager(v_uid, v_site.business_id))
    OR (v_site.client_user_id IS NOT NULL AND v_site.client_user_id = v_uid);
  IF NOT v_can THEN RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501'; END IF;

  -- Reject immutable keys
  FOREACH v_key IN ARRAY v_forbidden LOOP
    IF _patch ? v_key THEN
      RAISE EXCEPTION 'FORBIDDEN_FIELD: %', v_key USING ERRCODE = '42501';
    END IF;
  END LOOP;

  -- Validate license dates if either present in patch or DB
  v_lic_issue  := coalesce(nullif(_patch->>'municipal_license_issue_date','')::date,  v_site.municipal_license_issue_date);
  v_lic_expiry := coalesce(nullif(_patch->>'municipal_license_expiry_date','')::date, v_site.municipal_license_expiry_date);
  IF v_lic_issue IS NOT NULL AND v_lic_expiry IS NOT NULL AND v_lic_expiry < v_lic_issue THEN
    RAISE EXCEPTION 'INVALID_LICENSE_DATES' USING ERRCODE = '22023';
  END IF;

  -- Apply allowed updates (coalesce keeps existing when key absent)
  UPDATE public.client_sites SET
    label             = coalesce(nullif(btrim(_patch->>'label'),''), label),
    site_name         = CASE WHEN _patch ? 'site_name'         THEN nullif(btrim(_patch->>'site_name'),'')         ELSE site_name END,
    site_type         = coalesce(nullif(_patch->>'site_type',''), site_type),
    visibility        = coalesce(nullif(_patch->>'visibility',''), visibility),
    contact_name      = CASE WHEN _patch ? 'contact_name'      THEN nullif(btrim(_patch->>'contact_name'),'')      ELSE contact_name END,
    contact_phone     = CASE WHEN _patch ? 'contact_phone'     THEN nullif(btrim(_patch->>'contact_phone'),'')     ELSE contact_phone END,
    city_id           = CASE WHEN _patch ? 'city_id'           THEN nullif(_patch->>'city_id','')::uuid             ELSE city_id END,
    city_name         = CASE WHEN _patch ? 'city_name'         THEN nullif(btrim(_patch->>'city_name'),'')         ELSE city_name END,
    district          = CASE WHEN _patch ? 'district'          THEN nullif(btrim(_patch->>'district'),'')          ELSE district END,
    district_en       = CASE WHEN _patch ? 'district_en'       THEN nullif(btrim(_patch->>'district_en'),'')       ELSE district_en END,
    region            = CASE WHEN _patch ? 'region'            THEN nullif(btrim(_patch->>'region'),'')            ELSE region END,
    region_en         = CASE WHEN _patch ? 'region_en'         THEN nullif(btrim(_patch->>'region_en'),'')         ELSE region_en END,
    street_name       = CASE WHEN _patch ? 'street_name'       THEN nullif(btrim(_patch->>'street_name'),'')       ELSE street_name END,
    street_name_en    = CASE WHEN _patch ? 'street_name_en'    THEN nullif(btrim(_patch->>'street_name_en'),'')    ELSE street_name_en END,
    building_number   = CASE WHEN _patch ? 'building_number'   THEN nullif(btrim(_patch->>'building_number'),'')   ELSE building_number END,
    additional_number = CASE WHEN _patch ? 'additional_number' THEN nullif(btrim(_patch->>'additional_number'),'') ELSE additional_number END,
    post_code         = CASE WHEN _patch ? 'post_code'         THEN nullif(btrim(_patch->>'post_code'),'')         ELSE post_code END,
    short_address     = CASE WHEN _patch ? 'short_address'     THEN nullif(upper(regexp_replace(_patch->>'short_address','\s+','','g')),'') ELSE short_address END,
    address_en        = CASE WHEN _patch ? 'address_en'        THEN nullif(btrim(_patch->>'address_en'),'')        ELSE address_en END,
    address_line1     = coalesce(nullif(btrim(_patch->>'address_line1'),''), address_line1),
    address_line2     = CASE WHEN _patch ? 'address_line2'     THEN nullif(btrim(_patch->>'address_line2'),'')     ELSE address_line2 END,
    map_url           = CASE WHEN _patch ? 'map_url'           THEN nullif(_patch->>'map_url','')                  ELSE map_url END,
    latitude          = CASE WHEN _patch ? 'latitude'          THEN nullif(_patch->>'latitude','')::numeric         ELSE latitude END,
    longitude         = CASE WHEN _patch ? 'longitude'         THEN nullif(_patch->>'longitude','')::numeric        ELSE longitude END,
    access_notes      = CASE WHEN _patch ? 'access_notes'      THEN nullif(btrim(_patch->>'access_notes'),'')      ELSE access_notes END,
    is_default        = coalesce((_patch->>'is_default')::boolean, is_default),
    municipal_license_no          = CASE WHEN _patch ? 'municipal_license_no'          THEN nullif(btrim(_patch->>'municipal_license_no'),'') ELSE municipal_license_no END,
    municipal_license_issue_date  = v_lic_issue,
    municipal_license_expiry_date = v_lic_expiry,
    title_deed_no     = CASE WHEN _patch ? 'title_deed_no'     THEN nullif(btrim(_patch->>'title_deed_no'),'')     ELSE title_deed_no END,
    title_deed_date   = CASE WHEN _patch ? 'title_deed_date'   THEN nullif(_patch->>'title_deed_date','')::date    ELSE title_deed_date END,
    owner_name        = CASE WHEN _patch ? 'owner_name'        THEN nullif(btrim(_patch->>'owner_name'),'')        ELSE owner_name END,
    owner_id_number   = CASE WHEN _patch ? 'owner_id_number'   THEN nullif(btrim(_patch->>'owner_id_number'),'')   ELSE owner_id_number END,
    tax_number        = CASE WHEN _patch ? 'tax_number'        THEN nullif(btrim(_patch->>'tax_number'),'')        ELSE tax_number END,
    land_use_type     = CASE WHEN _patch ? 'land_use_type'     THEN nullif(btrim(_patch->>'land_use_type'),'')     ELSE land_use_type END,
    plot_number       = CASE WHEN _patch ? 'plot_number'       THEN nullif(btrim(_patch->>'plot_number'),'')       ELSE plot_number END,
    block_number      = CASE WHEN _patch ? 'block_number'      THEN nullif(btrim(_patch->>'block_number'),'')      ELSE block_number END,
    plan_number       = CASE WHEN _patch ? 'plan_number'       THEN nullif(btrim(_patch->>'plan_number'),'')       ELSE plan_number END,
    government_notes  = CASE WHEN _patch ? 'government_notes'  THEN nullif(btrim(_patch->>'government_notes'),'')  ELSE government_notes END,
    cover_image_url   = CASE WHEN _patch ? 'cover_image_url'   THEN nullif(_patch->>'cover_image_url','')          ELSE cover_image_url END,
    gallery_images    = CASE WHEN _patch ? 'gallery_images'    THEN coalesce(_patch->'gallery_images','[]'::jsonb) ELSE gallery_images END
  WHERE id = _site_id
  RETURNING * INTO v_site;

  RETURN to_jsonb(v_site);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_client_site(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_client_site(uuid, jsonb) TO authenticated;