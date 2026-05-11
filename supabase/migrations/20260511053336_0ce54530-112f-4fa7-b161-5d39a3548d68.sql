
-- Linkage columns on lead_requests
ALTER TABLE public.lead_requests
  ADD COLUMN IF NOT EXISTS converted_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_by uuid;

CREATE INDEX IF NOT EXISTS idx_lead_requests_converted_contract
  ON public.lead_requests(converted_contract_id)
  WHERE converted_contract_id IS NOT NULL;

-- Conversion function (admin only, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.admin_convert_lead_to_contract(_lead_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _lead   public.lead_requests%ROWTYPE;
  _provider uuid;
  _title  text;
  _amount numeric;
  _contract_id uuid;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT (public.has_role(_caller, 'admin') OR public.has_role(_caller, 'super_admin')) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _lead FROM public.lead_requests WHERE id = _lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'lead_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _lead.converted_contract_id IS NOT NULL THEN
    RAISE EXCEPTION 'already_converted' USING ERRCODE = '23505';
  END IF;

  IF _lead.status NOT IN ('accepted', 'quoted') THEN
    RAISE EXCEPTION 'invalid_status' USING ERRCODE = '22023';
  END IF;

  IF _lead.user_id IS NULL THEN
    RAISE EXCEPTION 'lead_has_no_registered_user' USING ERRCODE = '22023';
  END IF;

  SELECT user_id INTO _provider FROM public.businesses WHERE id = _lead.business_id;
  IF _provider IS NULL THEN
    RAISE EXCEPTION 'business_has_no_owner' USING ERRCODE = '22023';
  END IF;

  _title := COALESCE(NULLIF(trim(_lead.subject), ''), left(_lead.message, 120), 'Service request ' || COALESCE(_lead.ref_id, ''));
  _amount := COALESCE(_lead.quote_amount, 0);

  INSERT INTO public.contracts (
    client_id, provider_id, business_id,
    title_ar, total_amount, currency_code, status,
    vat_inclusive, vat_rate
  ) VALUES (
    _lead.user_id, _provider, _lead.business_id,
    _title, _amount, COALESCE(_lead.quote_currency, 'SAR'), 'draft',
    true, 15
  ) RETURNING id INTO _contract_id;

  UPDATE public.lead_requests
    SET converted_contract_id = _contract_id,
        converted_at = now(),
        converted_by = _caller,
        updated_at = now()
  WHERE id = _lead_id;

  INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
  VALUES (
    _caller,
    'lead_request_converted',
    'lead_request',
    _lead_id,
    jsonb_build_object(
      'contract_id', _contract_id,
      'lead_status', _lead.status,
      'business_id', _lead.business_id
    )
  );

  RETURN _contract_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_convert_lead_to_contract(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_convert_lead_to_contract(uuid) TO authenticated;
