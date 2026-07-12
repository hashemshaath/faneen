-- R2.1 additive columns
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS award_reason text,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS requires_sample boolean NOT NULL DEFAULT false;

ALTER TABLE public.opportunity_bids
  ADD COLUMN IF NOT EXISTS payment_terms text,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz,
  ADD COLUMN IF NOT EXISTS materials_brand_ids uuid[],
  ADD COLUMN IF NOT EXISTS vat_inclusive boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shortlisted_at timestamptz,
  ADD COLUMN IF NOT EXISTS decline_reason text;

-- R2.5 extend convert RPC (additive changes only)
CREATE OR REPLACE FUNCTION public.convert_awarded_bid_to_contract(p_opportunity_id uuid, p_bid_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_qr_user uuid;
  v_qr_status text;
  v_award_status text;
  v_awarded_bid uuid;
  v_awarded_provider_business uuid;
  v_qr_ref text;
  v_qr_description text;
  v_qr_city text;
  v_qr_country uuid;
  v_qr_location uuid;
  v_qr_site uuid;
  v_qr_award_reason text;
  v_bid_opp uuid;
  v_bid_status text;
  v_bid_provider_business uuid;
  v_bid_price numeric;
  v_bid_currency text;
  v_bid_scope text;
  v_bid_terms text;
  v_bid_warranty text;
  v_bid_payment_terms text;
  v_bid_valid_until timestamptz;
  v_bid_vat_inclusive boolean;
  v_bid_breakdown jsonb;
  v_provider_user uuid;
  v_existing_contract uuid;
  v_new_contract uuid;
  v_terms_composite text;
  v_desc_composite text;
  v_end_date date;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin'::public.app_role);

  SELECT user_id, status, award_status, awarded_bid_id, awarded_provider_business_id,
         ref_id, project_description, city, country_id, location_id, site_id, award_reason
    INTO v_qr_user, v_qr_status, v_award_status, v_awarded_bid, v_awarded_provider_business,
         v_qr_ref, v_qr_description, v_qr_city, v_qr_country, v_qr_location, v_qr_site, v_qr_award_reason
  FROM public.quote_requests
  WHERE id = p_opportunity_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'opportunity_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT v_is_admin AND (v_qr_user IS NULL OR v_qr_user <> v_uid) THEN
    RAISE EXCEPTION 'not_opportunity_owner' USING ERRCODE = '42501';
  END IF;

  IF v_award_status IS DISTINCT FROM 'awarded' OR v_awarded_bid IS NULL THEN
    RAISE EXCEPTION 'opportunity_not_awarded' USING ERRCODE = '22023';
  END IF;

  IF v_awarded_bid <> p_bid_id THEN
    RAISE EXCEPTION 'bid_not_the_awarded_bid' USING ERRCODE = '22023';
  END IF;

  SELECT opportunity_id, status, provider_business_id,
         price_amount, currency, scope_summary, terms, warranty,
         payment_terms, valid_until, vat_inclusive, price_breakdown
    INTO v_bid_opp, v_bid_status, v_bid_provider_business,
         v_bid_price, v_bid_currency, v_bid_scope, v_bid_terms, v_bid_warranty,
         v_bid_payment_terms, v_bid_valid_until, v_bid_vat_inclusive, v_bid_breakdown
  FROM public.opportunity_bids
  WHERE id = p_bid_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bid_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_bid_opp <> p_opportunity_id THEN
    RAISE EXCEPTION 'bid_opportunity_mismatch' USING ERRCODE = '22023';
  END IF;

  IF v_bid_status <> 'awarded' THEN
    RAISE EXCEPTION 'bid_not_in_awarded_status' USING ERRCODE = '22023';
  END IF;

  IF v_bid_provider_business IS NULL
     OR v_awarded_provider_business IS NULL
     OR v_bid_provider_business <> v_awarded_provider_business THEN
    RAISE EXCEPTION 'bid_provider_mismatch' USING ERRCODE = '22023';
  END IF;

  -- Idempotency
  SELECT id INTO v_existing_contract
  FROM public.contracts
  WHERE opportunity_bid_id = p_bid_id
  LIMIT 1;

  IF v_existing_contract IS NOT NULL THEN
    RETURN v_existing_contract;
  END IF;

  SELECT user_id INTO v_provider_user
  FROM public.businesses
  WHERE id = v_bid_provider_business;

  IF v_provider_user IS NULL THEN
    RAISE EXCEPTION 'provider_user_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Composite description
  v_desc_composite := COALESCE(v_qr_description, '') ||
    CASE WHEN v_bid_scope IS NOT NULL THEN E'\n\n' || v_bid_scope ELSE '' END ||
    CASE WHEN v_bid_warranty IS NOT NULL THEN E'\n\nالضمان: ' || v_bid_warranty ELSE '' END;

  -- Composite terms (append payment terms & award reason)
  v_terms_composite := COALESCE(v_bid_terms, '') ||
    CASE WHEN v_bid_payment_terms IS NOT NULL AND btrim(v_bid_payment_terms) <> ''
         THEN E'\n\nشروط الدفع: ' || v_bid_payment_terms ELSE '' END ||
    CASE WHEN v_qr_award_reason IS NOT NULL AND btrim(v_qr_award_reason) <> ''
         THEN E'\n\nسبب الترسية: ' || v_qr_award_reason ELSE '' END;
  IF btrim(v_terms_composite) = '' THEN v_terms_composite := NULL; END IF;

  -- Optional end_date from bid validity
  v_end_date := CASE WHEN v_bid_valid_until IS NOT NULL THEN v_bid_valid_until::date ELSE NULL END;

  INSERT INTO public.contracts (
    client_id,
    provider_id,
    business_id,
    title_ar,
    description_ar,
    total_amount,
    currency_code,
    status,
    terms_ar,
    country_id,
    execution_site_id,
    location_id,
    opportunity_id,
    opportunity_bid_id,
    vat_inclusive,
    end_date
  ) VALUES (
    v_qr_user,
    v_provider_user,
    v_bid_provider_business,
    COALESCE('عقد فرصة ' || NULLIF(v_qr_ref, ''), 'عقد فرصة'),
    v_desc_composite,
    COALESCE(v_bid_price, 0),
    COALESCE(NULLIF(v_bid_currency, ''), 'SAR'),
    'draft'::public.contract_status,
    v_terms_composite,
    v_qr_country,
    v_qr_site,
    v_qr_location,
    p_opportunity_id,
    p_bid_id,
    COALESCE(v_bid_vat_inclusive, true),
    v_end_date
  )
  RETURNING id INTO v_new_contract;

  -- Snapshot price breakdown into contract_line_items when present
  IF v_bid_breakdown IS NOT NULL AND jsonb_typeof(v_bid_breakdown) = 'array'
     AND jsonb_array_length(v_bid_breakdown) > 0 THEN
    INSERT INTO public.contract_line_items (
      contract_id, name_ar, description_ar, quantity, unit_price,
      item_type, sort_order, unit_of_measure
    )
    SELECT
      v_new_contract,
      COALESCE(NULLIF(elem->>'name', ''), 'بند'),
      NULLIF(elem->>'description', ''),
      COALESCE((elem->>'quantity')::numeric, 1),
      COALESCE((elem->>'unit_price')::numeric, 0),
      'service',
      (idx - 1)::int,
      NULLIF(elem->>'unit', '')
    FROM jsonb_array_elements(v_bid_breakdown) WITH ORDINALITY AS t(elem, idx);
  END IF;

  -- Mark opportunity as matched + closed
  UPDATE public.quote_requests
     SET status = 'matched',
         closed_at = COALESCE(closed_at, now())
   WHERE id = p_opportunity_id
     AND status IN ('new', 'under_review', 'contacted');

  INSERT INTO public.quote_request_events (quote_request_id, event_type, actor_user_id, metadata)
  VALUES (
    p_opportunity_id,
    'contract_created_from_bid',
    v_uid,
    jsonb_build_object(
      'bid_id', p_bid_id,
      'contract_id', v_new_contract,
      'vat_inclusive', COALESCE(v_bid_vat_inclusive, true),
      'line_items', COALESCE(jsonb_array_length(v_bid_breakdown), 0)
    )
  );

  RETURN v_new_contract;
END;
$function$;