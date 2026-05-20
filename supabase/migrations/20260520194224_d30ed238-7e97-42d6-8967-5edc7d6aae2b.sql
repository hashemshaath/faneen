-- Barcode Phase 7: extend verify_contract_public to accept barcode_code
-- and return contract_barcode_code, provider_name, created_at.
-- Public-safe. No PII, no totals, no token hashes.

CREATE OR REPLACE FUNCTION public.verify_contract_public(
  _contract_number text DEFAULT NULL,
  _hash text DEFAULT NULL,
  _barcode_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  v_amend_count int;
  v_barcode text;
  v_provider_name text;
  v_resolved_via text := 'contract_number';
BEGIN
  -- Resolve via barcode_code first if provided
  IF _barcode_code IS NOT NULL AND length(_barcode_code) >= 4 THEN
    SELECT ct.id, ct.contract_number, ct.status::text AS status, ct.locked_at,
           ct.start_date, ct.end_date, ct.document_hash, ct.currency_code,
           ct.business_id, ct.created_at
      INTO c
      FROM public.barcode_registry br
      JOIN public.contracts ct
        ON ct.id = br.entity_id
     WHERE br.entity_type = 'contract'
       AND br.barcode_code = upper(_barcode_code)
       AND br.status = 'active'
       AND ct.status::text IN ('active','completed','cancelled','disputed')
     LIMIT 1;
    IF FOUND THEN
      v_resolved_via := 'barcode_code';
    END IF;
  END IF;

  -- Fallback to contract_number + hash
  IF NOT FOUND THEN
    IF _contract_number IS NULL OR _hash IS NULL OR length(_hash) < 8 THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'invalid_input');
    END IF;

    SELECT id, contract_number, status::text AS status, locked_at,
           start_date, end_date, document_hash, currency_code,
           business_id, created_at
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
  END IF;

  SELECT GREATEST(count(*) - 1, 0)::int
    INTO v_amend_count
    FROM public.contract_versions
   WHERE contract_id = c.id;

  SELECT barcode_code INTO v_barcode
    FROM public.barcode_registry
   WHERE entity_type = 'contract' AND entity_id = c.id AND status = 'active'
   LIMIT 1;

  IF c.business_id IS NOT NULL THEN
    SELECT COALESCE(b.name_en, b.name_ar) INTO v_provider_name
      FROM public.businesses b
     WHERE b.id = c.business_id
     LIMIT 1;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'contract_number', c.contract_number,
    'contract_barcode_code', v_barcode,
    'provider_name', v_provider_name,
    'status', c.status,
    'locked_at', c.locked_at,
    'created_at', c.created_at,
    'start_date', c.start_date,
    'end_date', c.end_date,
    'currency', c.currency_code,
    'hash_prefix', CASE WHEN c.document_hash IS NOT NULL THEN left(c.document_hash, 12) ELSE NULL END,
    'amendment_count', v_amend_count,
    'resolved_via', v_resolved_via
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_contract_public(text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_contract_public(text, text, text) TO anon, authenticated;