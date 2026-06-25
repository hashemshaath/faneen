-- 1) Add pricing_basis column to contracts with restricted values
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS pricing_basis text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'contracts_pricing_basis_chk'
      AND conrelid = 'public.contracts'::regclass
  ) THEN
    ALTER TABLE public.contracts
      ADD CONSTRAINT contracts_pricing_basis_chk
      CHECK (
        pricing_basis IS NULL
        OR pricing_basis IN ('linear_meter','square_meter','unit','mixed')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.contracts.pricing_basis IS
  'Stores the selected contract pricing basis from the creation flow.';

-- 2) Extend create_contract_from_template to accept and persist _pricing_basis,
--    without changing existing call sites that omit it.
CREATE OR REPLACE FUNCTION public.create_contract_from_template(
  _payload jsonb,
  _template_version_id uuid,
  _pricing_method text DEFAULT NULL::text,
  _pricing_basis text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract_id         uuid;
  v_snapshot_id         uuid;
  v_template_id         uuid;
  v_service_category_id uuid;
  v_status              text;
  v_provider_id         uuid;
  v_client_id           uuid;
  v_guest_email         text;
  v_guest_phone         text;
  v_guest_name          text;
  v_payload             jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;
  IF _template_version_id IS NULL THEN
    RAISE EXCEPTION 'template_version_id_required';
  END IF;

  IF _pricing_basis IS NOT NULL
     AND _pricing_basis NOT IN ('linear_meter','square_meter','unit','mixed') THEN
    RAISE EXCEPTION 'invalid_pricing_basis';
  END IF;

  SELECT v.status, v.template_id, t.service_category_id
    INTO v_status, v_template_id, v_service_category_id
  FROM contract_template_versions v
  JOIN contract_templates t ON t.id = v.template_id
  WHERE v.id = _template_version_id;

  IF v_status IS NULL THEN RAISE EXCEPTION 'template_version_not_found'; END IF;
  IF v_status <> 'published' THEN RAISE EXCEPTION 'template_version_not_published'; END IF;

  v_provider_id := NULLIF(_payload->>'provider_id','')::uuid;
  v_client_id   := NULLIF(_payload->>'client_id','')::uuid;
  v_guest_email := NULLIF(btrim(_payload->>'guest_client_email'), '');
  v_guest_phone := NULLIF(btrim(_payload->>'guest_client_phone'), '');
  v_guest_name  := NULLIF(btrim(_payload->>'guest_client_name'),  '');

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'provider_required';
  END IF;
  IF v_client_id IS NULL AND v_guest_email IS NULL AND v_guest_phone IS NULL THEN
    RAISE EXCEPTION 'client_or_guest_required';
  END IF;
  IF v_provider_id <> auth.uid()
     AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden_provider_mismatch';
  END IF;

  v_payload := _payload || jsonb_build_object(
    'template_version_id', _template_version_id,
    'service_category_id', COALESCE(NULLIF(_payload->>'service_category_id','')::uuid, v_service_category_id),
    'pricing_method',      _pricing_method,
    'pricing_basis',       _pricing_basis,
    'status',              COALESCE(NULLIF(_payload->>'status',''), 'draft')
  );

  INSERT INTO contracts (
    provider_id, client_id, business_id,
    title_ar, title_en, description_ar, description_en,
    total_amount, currency_code, start_date, end_date,
    terms_ar, terms_en,
    supervisor_name, supervisor_phone, supervisor_email,
    status, vat_inclusive, vat_rate,
    template_version_id, service_category_id, pricing_method, pricing_basis,
    guest_client_name, guest_client_email, guest_client_phone
  ) VALUES (
    v_provider_id, v_client_id, NULLIF(v_payload->>'business_id','')::uuid,
    v_payload->>'title_ar', NULLIF(v_payload->>'title_en',''),
    NULLIF(v_payload->>'description_ar',''), NULLIF(v_payload->>'description_en',''),
    COALESCE((v_payload->>'total_amount')::numeric, 0),
    COALESCE(v_payload->>'currency_code', 'SAR'),
    NULLIF(v_payload->>'start_date','')::date,
    NULLIF(v_payload->>'end_date','')::date,
    NULLIF(v_payload->>'terms_ar',''), NULLIF(v_payload->>'terms_en',''),
    NULLIF(v_payload->>'supervisor_name',''),
    NULLIF(v_payload->>'supervisor_phone',''),
    NULLIF(v_payload->>'supervisor_email',''),
    v_payload->>'status',
    COALESCE((v_payload->>'vat_inclusive')::boolean, false),
    COALESCE((v_payload->>'vat_rate')::numeric, 15),
    _template_version_id,
    NULLIF(v_payload->>'service_category_id','')::uuid,
    _pricing_method,
    _pricing_basis,
    v_guest_name, v_guest_email, v_guest_phone
  ) RETURNING id INTO v_contract_id;

  INSERT INTO contract_template_snapshots (contract_id, version_id, frozen_payload, created_by)
  VALUES (v_contract_id, _template_version_id, public._build_template_snapshot_payload(_template_version_id), auth.uid())
  RETURNING id INTO v_snapshot_id;

  UPDATE contracts SET template_snapshot_id = v_snapshot_id WHERE id = v_contract_id;
  RETURN v_contract_id;
END;
$function$;