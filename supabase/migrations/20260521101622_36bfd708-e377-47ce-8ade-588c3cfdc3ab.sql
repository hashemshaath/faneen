CREATE OR REPLACE FUNCTION public.resolve_barcode(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_code text;
  v_row  public.barcode_registry%ROWTYPE;
  v_payload jsonb;
  v_result_type text;
  v_contracts jsonb;
  v_counts jsonb;
  v_lead_requests jsonb;
  v_lead_counts jsonb;
BEGIN
  v_code := public.normalize_barcode_code(_code);
  IF v_code IS NULL OR length(v_code) < 4 THEN
    RETURN jsonb_build_object('status','unavailable');
  END IF;

  SELECT * INTO v_row FROM public.barcode_registry WHERE barcode_code = v_code LIMIT 1;

  IF NOT FOUND OR v_row.status <> 'active' THEN
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

  UPDATE public.barcode_registry
     SET scan_count = scan_count + 1,
         last_scanned_at = now()
   WHERE id = v_row.id;

  v_result_type := 'available';

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
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'contract_number', c.contract_number,
        'title',           COALESCE(c.title_ar, c.title_en),
        'status',          c.status::text,
        'start_date',      c.start_date,
        'end_date',        c.end_date,
        'created_at',      c.created_at,
        'is_closed',       (c.status IN ('completed','cancelled'))
      )
      ORDER BY c.created_at DESC
    ), '[]'::jsonb)
      INTO v_contracts
    FROM public.contracts c
    WHERE c.business_id = v_row.entity_id
      AND COALESCE(c.is_demo, false) = false
      AND c.status <> 'draft';

    SELECT jsonb_build_object(
      'open',      COUNT(*) FILTER (WHERE c.status IN ('active','pending_approval','disputed')),
      'closed',    COUNT(*) FILTER (WHERE c.status IN ('completed','cancelled')),
      'total',     COUNT(*)
    )
      INTO v_counts
    FROM public.contracts c
    WHERE c.business_id = v_row.entity_id
      AND COALESCE(c.is_demo, false) = false
      AND c.status <> 'draft';

    -- Open contract requests (طلبات عقود) grouped by sector
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'ref_id',     lr.ref_id,
        'subject',    lr.subject,
        'sector',     lr.project_scope,
        'status',     lr.status,
        'created_at', lr.created_at
      )
      ORDER BY lr.created_at DESC
    ), '[]'::jsonb)
      INTO v_lead_requests
    FROM public.lead_requests lr
    WHERE lr.business_id = v_row.entity_id
      AND COALESCE(lr.is_demo, false) = false
      AND lr.status NOT IN ('closed','cancelled','rejected')
      AND lr.converted_contract_id IS NULL
      AND lr.project_scope IN ('aluminum','blacksmith','kitchens');

    SELECT jsonb_build_object(
      'aluminum',  COUNT(*) FILTER (WHERE lr.project_scope = 'aluminum'),
      'blacksmith',COUNT(*) FILTER (WHERE lr.project_scope = 'blacksmith'),
      'kitchens',  COUNT(*) FILTER (WHERE lr.project_scope = 'kitchens'),
      'total',     COUNT(*)
    )
      INTO v_lead_counts
    FROM public.lead_requests lr
    WHERE lr.business_id = v_row.entity_id
      AND COALESCE(lr.is_demo, false) = false
      AND lr.status NOT IN ('closed','cancelled','rejected')
      AND lr.converted_contract_id IS NULL
      AND lr.project_scope IN ('aluminum','blacksmith','kitchens');

    SELECT jsonb_build_object(
      'status','available',
      'barcode_code', v_row.barcode_code,
      'entity_type','business',
      'visibility',  v_row.visibility,
      'title',       COALESCE(b.name_ar, b.name_en, v_row.barcode_code),
      'subtitle',    b.username,
      'data', jsonb_build_object(
        'username',           b.username,
        'public_profile_path', CASE WHEN b.username IS NOT NULL THEN '/' || b.username ELSE NULL END,
        'is_verified',        COALESCE(b.is_verified, false),
        'approved',           (b.approval_status = 'approved' AND b.is_active = true),
        'contracts',          COALESCE(v_contracts, '[]'::jsonb),
        'contracts_counts',   COALESCE(v_counts, jsonb_build_object('open',0,'closed',0,'total',0)),
        'lead_requests',      COALESCE(v_lead_requests, '[]'::jsonb),
        'lead_counts',        COALESCE(v_lead_counts, jsonb_build_object('aluminum',0,'blacksmith',0,'kitchens',0,'total',0))
      )
    )
    INTO v_payload
    FROM public.businesses b
    WHERE b.id = v_row.entity_id;

  ELSE
    v_payload := jsonb_build_object('status','unavailable');
    v_result_type := 'unavailable_entity_type';
  END IF;

  IF v_payload IS NULL THEN
    v_payload := jsonb_build_object('status','unavailable');
    v_result_type := 'entity_missing';
  END IF;

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
END $function$;

GRANT EXECUTE ON FUNCTION public.resolve_barcode(text) TO anon, authenticated;