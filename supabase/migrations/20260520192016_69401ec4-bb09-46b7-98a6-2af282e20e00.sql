
CREATE OR REPLACE FUNCTION public.resolve_barcode(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_row  public.barcode_registry%ROWTYPE;
  v_payload jsonb;
  v_result_type text;
BEGIN
  v_code := public.normalize_barcode_code(_code);
  IF v_code IS NULL OR length(v_code) < 4 THEN
    RETURN jsonb_build_object('status','unavailable');
  END IF;

  SELECT * INTO v_row FROM public.barcode_registry WHERE barcode_code = v_code LIMIT 1;

  -- Never reveal existence vs. status. Treat all non-active as generic unavailable.
  IF NOT FOUND OR v_row.status <> 'active' THEN
    -- Still log a scan attempt without leaking metadata
    IF FOUND THEN
      INSERT INTO public.barcode_events (barcode_id, event_type, actor_user_id, actor_role, metadata)
      VALUES (
        v_row.id, 'scanned', auth.uid(),
        CASE WHEN auth.uid() IS NULL THEN 'anon' ELSE 'user' END,
        jsonb_build_object('result_type','unavailable','source','public_q_route')
      );
    END IF;
    RETURN jsonb_build_object('status','unavailable');
  END IF;

  -- Increment scan counters atomically
  UPDATE public.barcode_registry
     SET scan_count = scan_count + 1,
         last_scanned_at = now()
   WHERE id = v_row.id;

  v_result_type := 'available';

  -- Build entity-specific safe payload
  IF v_row.entity_type = 'client_site' THEN
    SELECT jsonb_build_object(
      'status','available',
      'barcode_code', v_row.barcode_code,
      'entity_type','client_site',
      'visibility',  v_row.visibility,
      'title',       COALESCE(cs.site_name, v_row.barcode_code),
      'subtitle',    NULLIF(concat_ws(' · ',
                        NULLIF(cs.site_type,''),
                        NULLIF(cs.city_name,'')
                      ), ''),
      'data', jsonb_build_object(
        'site_ref',   cs.site_ref,
        'site_name',  cs.site_name,
        'site_type',  cs.site_type,
        'city_name',  cs.city_name
      )
    )
    INTO v_payload
    FROM public.client_sites cs
    WHERE cs.id = v_row.entity_id;

  ELSIF v_row.entity_type = 'contract' THEN
    SELECT jsonb_build_object(
      'status','available',
      'barcode_code', v_row.barcode_code,
      'entity_type','contract',
      'visibility',  v_row.visibility,
      'title',       COALESCE(c.contract_number, v_row.barcode_code),
      'subtitle',    c.status,
      'data', jsonb_build_object(
        'contract_number', c.contract_number,
        'contract_status', c.status,
        'created_at',      c.created_at,
        'provider_name',
          CASE WHEN b.approval_status = 'approved' AND b.is_active = true
               THEN COALESCE(b.name_en, b.name_ar) ELSE NULL END,
        'provider_username',
          CASE WHEN b.approval_status = 'approved' AND b.is_active = true
               THEN b.username ELSE NULL END
      )
    )
    INTO v_payload
    FROM public.contracts c
    LEFT JOIN public.businesses b ON b.id = c.business_id
    WHERE c.id = v_row.entity_id;

  ELSIF v_row.entity_type = 'business' THEN
    SELECT jsonb_build_object(
      'status','available',
      'barcode_code', v_row.barcode_code,
      'entity_type','business',
      'visibility',  v_row.visibility,
      'title',       COALESCE(b.name_en, b.name_ar, v_row.barcode_code),
      'subtitle',    b.username,
      'data', jsonb_build_object(
        'username',           b.username,
        'public_profile_path', CASE WHEN b.username IS NOT NULL THEN '/' || b.username ELSE NULL END,
        'is_verified',        COALESCE(b.is_verified, false),
        'approved',           (b.approval_status = 'approved' AND b.is_active = true)
      )
    )
    INTO v_payload
    FROM public.businesses b
    WHERE b.id = v_row.entity_id;

  ELSE
    -- customer / lead / maintenance / asset: never public on this route
    v_payload := jsonb_build_object('status','unavailable');
    v_result_type := 'unavailable_entity_type';
  END IF;

  IF v_payload IS NULL THEN
    v_payload := jsonb_build_object('status','unavailable');
    v_result_type := 'entity_missing';
  END IF;

  -- Scan event — safe metadata only
  INSERT INTO public.barcode_events (barcode_id, event_type, actor_user_id, actor_role, metadata)
  VALUES (
    v_row.id, 'scanned', auth.uid(),
    CASE WHEN auth.uid() IS NULL THEN 'anon' ELSE 'user' END,
    jsonb_build_object(
      'entity_type', v_row.entity_type,
      'visibility',  v_row.visibility,
      'result_type', v_result_type,
      'source',      'public_q_route'
    )
  );

  RETURN v_payload;
END $$;

REVOKE ALL ON FUNCTION public.resolve_barcode(text) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_barcode(text) TO anon, authenticated, service_role;
