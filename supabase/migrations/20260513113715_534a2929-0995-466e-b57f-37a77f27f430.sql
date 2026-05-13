-- Phase 5B.5 — link_lead_to_contract RPC
CREATE OR REPLACE FUNCTION public.link_lead_to_contract(
  _lead_id uuid,
  _contract_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_lead record;
  v_contract record;
  v_is_admin boolean;
  v_is_business_mgr boolean;
  v_now timestamptz := now();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'LEAD_LINK:UNAUTHENTICATED';
  END IF;
  IF _lead_id IS NULL OR _contract_id IS NULL THEN
    RAISE EXCEPTION 'LEAD_LINK:INVALID_INPUT';
  END IF;

  SELECT id, business_id, converted_contract_id, status
    INTO v_lead
    FROM public.lead_requests
   WHERE id = _lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_LINK:LEAD_NOT_FOUND';
  END IF;

  SELECT id, provider_id, business_id, status
    INTO v_contract
    FROM public.contracts
   WHERE id = _contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'LEAD_LINK:CONTRACT_NOT_FOUND';
  END IF;

  -- Same business for both rows
  IF v_lead.business_id IS DISTINCT FROM v_contract.business_id THEN
    RAISE EXCEPTION 'LEAD_LINK:BUSINESS_MISMATCH';
  END IF;

  -- Authorization: provider of contract OR business owner/manager OR admin
  v_is_admin := public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin');
  v_is_business_mgr := false;
  IF v_lead.business_id IS NOT NULL THEN
    v_is_business_mgr := public.is_business_owner_or_manager(v_lead.business_id, v_uid);
  END IF;

  IF NOT (v_is_admin OR v_is_business_mgr OR v_contract.provider_id = v_uid) THEN
    RAISE EXCEPTION 'LEAD_LINK:FORBIDDEN';
  END IF;

  -- Contract status must allow linking
  IF v_contract.status NOT IN ('draft', 'pending_approval') THEN
    RAISE EXCEPTION 'LEAD_LINK:CONTRACT_STATE_INVALID';
  END IF;

  -- Idempotency / duplicate handling
  IF v_lead.converted_contract_id IS NOT NULL THEN
    IF v_lead.converted_contract_id = _contract_id THEN
      RETURN jsonb_build_object(
        'linked', true,
        'no_op', true,
        'lead_id', v_lead.id,
        'contract_id', v_contract.id
      );
    END IF;
    RAISE EXCEPTION 'LEAD_LINK:ALREADY_CONVERTED:%', v_lead.converted_contract_id;
  END IF;

  UPDATE public.lead_requests
     SET converted_contract_id = _contract_id,
         converted_at = v_now,
         converted_by = v_uid,
         updated_at = v_now
   WHERE id = _lead_id;

  RETURN jsonb_build_object(
    'linked', true,
    'no_op', false,
    'lead_id', v_lead.id,
    'contract_id', v_contract.id,
    'converted_at', v_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.link_lead_to_contract(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_lead_to_contract(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.link_lead_to_contract(uuid, uuid) IS
  'Phase 5B.5 — Links a lead_requests row to a draft/pending contract. Sets converted_contract_id/at/by only. Never mutates lead status, contract status, attachments, notes, or quote_amount.';