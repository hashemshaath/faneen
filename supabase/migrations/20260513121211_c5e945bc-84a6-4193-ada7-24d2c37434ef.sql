CREATE OR REPLACE FUNCTION public.get_contract_source_lead_summary(_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_contract record;
  v_lead record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, business_id, provider_id, client_id, source_lead_id
    INTO v_contract
  FROM public.contracts
  WHERE id = _contract_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Authorization: contract party or admin
  IF NOT (
    v_contract.provider_id = v_uid
    OR v_contract.client_id = v_uid
    OR public.has_admin_access(v_uid)
  ) THEN
    RETURN NULL;
  END IF;

  IF v_contract.source_lead_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id, ref_id, business_id, subject, status, source,
         contact_preference, created_at, converted_at
    INTO v_lead
  FROM public.lead_requests
  WHERE id = v_contract.source_lead_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Cross-business safety: lead must belong to same business
  IF v_lead.business_id IS DISTINCT FROM v_contract.business_id THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'lead_id', v_lead.id,
    'lead_ref_id', v_lead.ref_id,
    'subject', v_lead.subject,
    'status', v_lead.status,
    'source', v_lead.source,
    'contact_preference', v_lead.contact_preference,
    'created_at', v_lead.created_at,
    'converted_at', v_lead.converted_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_contract_source_lead_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_contract_source_lead_summary(uuid) TO authenticated;