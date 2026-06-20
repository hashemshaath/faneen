-- OPPORTUNITIES PHASE 7 — contract conversion from awarded bid
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS opportunity_bid_id uuid REFERENCES public.opportunity_bids(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS contracts_opportunity_id_idx ON public.contracts(opportunity_id);
CREATE INDEX IF NOT EXISTS contracts_opportunity_bid_id_idx ON public.contracts(opportunity_bid_id);

-- Prevent two contracts for the same winning bid.
CREATE UNIQUE INDEX IF NOT EXISTS contracts_opportunity_bid_id_unique
  ON public.contracts(opportunity_bid_id)
  WHERE opportunity_bid_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.convert_awarded_bid_to_contract(
  p_opportunity_id uuid,
  p_bid_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_bid_opp uuid;
  v_bid_status text;
  v_bid_provider_business uuid;
  v_bid_price numeric;
  v_bid_currency text;
  v_bid_scope text;
  v_bid_terms text;
  v_bid_warranty text;
  v_provider_user uuid;
  v_existing_contract uuid;
  v_new_contract uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required' USING ERRCODE = '42501';
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin'::public.app_role);

  SELECT user_id, status, award_status, awarded_bid_id, awarded_provider_business_id,
         ref_id, project_description, city, country_id, location_id, site_id
    INTO v_qr_user, v_qr_status, v_award_status, v_awarded_bid, v_awarded_provider_business,
         v_qr_ref, v_qr_description, v_qr_city, v_qr_country, v_qr_location, v_qr_site
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
         price_amount, currency, scope_summary, terms, warranty
    INTO v_bid_opp, v_bid_status, v_bid_provider_business,
         v_bid_price, v_bid_currency, v_bid_scope, v_bid_terms, v_bid_warranty
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

  -- Idempotency: contract for this bid already exists → return it.
  SELECT id INTO v_existing_contract
  FROM public.contracts
  WHERE opportunity_bid_id = p_bid_id
  LIMIT 1;

  IF v_existing_contract IS NOT NULL THEN
    RETURN v_existing_contract;
  END IF;

  -- Resolve provider auth user from the winning provider business.
  SELECT user_id INTO v_provider_user
  FROM public.businesses
  WHERE id = v_bid_provider_business;

  IF v_provider_user IS NULL THEN
    RAISE EXCEPTION 'provider_user_not_found' USING ERRCODE = 'P0002';
  END IF;

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
    opportunity_bid_id
  ) VALUES (
    v_qr_user,
    v_provider_user,
    v_bid_provider_business,
    COALESCE('عقد فرصة ' || NULLIF(v_qr_ref, ''), 'عقد فرصة'),
    COALESCE(v_qr_description, '') ||
      CASE WHEN v_bid_scope IS NOT NULL THEN E'\n\n' || v_bid_scope ELSE '' END ||
      CASE WHEN v_bid_warranty IS NOT NULL THEN E'\n\nالضمان: ' || v_bid_warranty ELSE '' END,
    COALESCE(v_bid_price, 0),
    COALESCE(NULLIF(v_bid_currency, ''), 'SAR'),
    'draft'::public.contract_status,
    v_bid_terms,
    v_qr_country,
    v_qr_site,
    v_qr_location,
    p_opportunity_id,
    p_bid_id
  )
  RETURNING id INTO v_new_contract;

  INSERT INTO public.quote_request_events (quote_request_id, event_type, actor_user_id, metadata)
  VALUES (
    p_opportunity_id,
    'contract_created_from_opportunity',
    v_uid,
    jsonb_build_object(
      'bid_id', p_bid_id,
      'contract_id', v_new_contract,
      'provider_business_id', v_bid_provider_business
    )
  );

  BEGIN
    IF v_qr_user IS NOT NULL THEN
      INSERT INTO public.notifications
        (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id)
      VALUES
        (v_qr_user,
         'تم إنشاء عقد مبدئي',
         'Draft contract created',
         'تم إنشاء عقد مبدئي من العرض الفائز على فرصتك.',
         'A draft contract has been created from the winning bid on your opportunity.',
         'opportunity_contract_created',
         'contract',
         v_new_contract);
    END IF;

    IF v_provider_user IS NOT NULL THEN
      INSERT INTO public.notifications
        (user_id, title_ar, title_en, body_ar, body_en, notification_type, reference_type, reference_id)
      VALUES
        (v_provider_user,
         'تم إنشاء عقد من عرضك',
         'A contract was created from your bid',
         'تم إنشاء عقد مبدئي من عرضك الفائز.',
         'A draft contract has been created from your winning bid.',
         'opportunity_contract_created_provider',
         'contract',
         v_new_contract);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_new_contract;
END;
$$;

REVOKE ALL ON FUNCTION public.convert_awarded_bid_to_contract(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.convert_awarded_bid_to_contract(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.convert_awarded_bid_to_contract(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_awarded_bid_to_contract(uuid, uuid) TO service_role;