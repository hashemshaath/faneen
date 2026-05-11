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
  _action_url text;
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

  -- SR-4C: notify client and provider. Fail-soft: notification errors must not roll back the contract.
  _action_url := '/contracts/' || _contract_id::text;

  BEGIN
    PERFORM public.create_notification(
      _lead.user_id,
      'تم إنشاء مسودة عقد لطلبك',
      'A draft contract has been created for your request',
      'يمكنك مراجعة تفاصيل العقد من لوحة التحكم ومتابعة الخطوات التالية.',
      'You can review the contract details from your dashboard and continue the next steps.',
      'contract_draft_created_for_client',
      _contract_id,
      'contract',
      _action_url
    );
  EXCEPTION WHEN OTHERS THEN
    -- swallow notification errors; conversion already succeeded
    NULL;
  END;

  BEGIN
    PERFORM public.create_notification(
      _provider,
      'تم إنشاء مسودة عقد جديدة',
      'A new draft contract has been created',
      'يمكنك مراجعة العقد ومتابعة الإجراءات من لوحة التحكم.',
      'You can review the contract and continue from your dashboard.',
      'contract_draft_created_for_provider',
      _contract_id,
      'contract',
      _action_url
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN _contract_id;
END;
$$;