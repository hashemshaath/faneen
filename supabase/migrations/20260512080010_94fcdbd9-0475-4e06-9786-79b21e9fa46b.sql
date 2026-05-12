CREATE OR REPLACE FUNCTION public.verify_contract_public(_contract_number text, _hash text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  v_amend_count int;
BEGIN
  IF _contract_number IS NULL OR _hash IS NULL OR length(_hash) < 8 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid_input');
  END IF;

  SELECT id, contract_number, status::text AS status, locked_at, start_date, end_date,
         document_hash, currency_code
    INTO c
    FROM public.contracts
   WHERE contract_number = _contract_number
     AND status::text IN ('active','completed','cancelled','disputed')
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF c.document_hash IS NULL OR c.document_hash <> _hash THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'hash_mismatch',
      'contract_number', c.contract_number,
      'status', c.status
    );
  END IF;

  SELECT GREATEST(count(*) - 1, 0)::int
    INTO v_amend_count
    FROM public.contract_versions
   WHERE contract_id = c.id;

  RETURN jsonb_build_object(
    'valid', true,
    'contract_number', c.contract_number,
    'status', c.status,
    'locked_at', c.locked_at,
    'start_date', c.start_date,
    'end_date', c.end_date,
    'currency', c.currency_code,
    'hash_prefix', left(c.document_hash, 12),
    'amendment_count', v_amend_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_contract_public(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_contract_public(text, text) TO anon, authenticated;