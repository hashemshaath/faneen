
CREATE OR REPLACE FUNCTION public.update_contract_draft_autosave(
  _contract_id uuid,
  _patch jsonb,
  _expected_updated_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.contracts;
  _is_admin boolean;
  _allowed text[] := ARRAY[
    'title_ar','title_en','description_ar','description_en',
    'start_date','end_date','terms_ar','terms_en',
    'supervisor_name','supervisor_phone','supervisor_email',
    'vat_inclusive','vat_rate','currency_code','total_amount'
  ];
  _key text;
  _val jsonb;
  _set_parts text[] := ARRAY[]::text[];
  _params jsonb := '{}'::jsonb;
  _new_updated_at timestamptz;
  _vat_rate numeric;
  _total numeric;
  _vat_incl boolean;
  _start date;
  _end date;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_AUTOSAVE:UNAUTHENTICATED';
  END IF;

  IF _patch IS NULL OR jsonb_typeof(_patch) <> 'object' THEN
    RAISE EXCEPTION 'CONTRACT_AUTOSAVE:INVALID_PATCH';
  END IF;

  SELECT * INTO _row FROM public.contracts WHERE id = _contract_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONTRACT_AUTOSAVE:NOT_FOUND';
  END IF;

  _is_admin := public.has_role(_uid, 'admin'::public.app_role)
            OR public.has_role(_uid, 'super_admin'::public.app_role);

  IF NOT (_row.provider_id = _uid OR _is_admin) THEN
    RAISE EXCEPTION 'CONTRACT_AUTOSAVE:FORBIDDEN';
  END IF;

  IF _row.status::text <> 'draft' THEN
    RAISE EXCEPTION 'CONTRACT_AUTOSAVE:NOT_DRAFT';
  END IF;

  IF _expected_updated_at IS NOT NULL AND _row.updated_at <> _expected_updated_at THEN
    RAISE EXCEPTION 'CONTRACT_AUTOSAVE:STALE_VERSION';
  END IF;

  -- Validate keys
  FOR _key IN SELECT jsonb_object_keys(_patch) LOOP
    IF NOT (_key = ANY(_allowed)) THEN
      RAISE EXCEPTION 'CONTRACT_AUTOSAVE:FIELD_NOT_ALLOWED:%', _key;
    END IF;
  END LOOP;

  -- No-op for empty patch
  IF (SELECT count(*) FROM jsonb_object_keys(_patch)) = 0 THEN
    RETURN jsonb_build_object(
      'updated_at', _row.updated_at,
      'status', _row.status::text,
      'autosaved', false,
      'no_op', true
    );
  END IF;

  -- Validate value types/ranges
  IF _patch ? 'vat_rate' THEN
    IF jsonb_typeof(_patch->'vat_rate') <> 'number' THEN
      RAISE EXCEPTION 'CONTRACT_AUTOSAVE:INVALID_VALUE:vat_rate';
    END IF;
    _vat_rate := (_patch->>'vat_rate')::numeric;
    IF _vat_rate < 0 OR _vat_rate > 100 THEN
      RAISE EXCEPTION 'CONTRACT_AUTOSAVE:INVALID_VALUE:vat_rate';
    END IF;
  END IF;

  IF _patch ? 'total_amount' THEN
    IF jsonb_typeof(_patch->'total_amount') <> 'number' THEN
      RAISE EXCEPTION 'CONTRACT_AUTOSAVE:INVALID_VALUE:total_amount';
    END IF;
    _total := (_patch->>'total_amount')::numeric;
    IF _total < 0 THEN
      RAISE EXCEPTION 'CONTRACT_AUTOSAVE:INVALID_VALUE:total_amount';
    END IF;
  END IF;

  IF _patch ? 'vat_inclusive' THEN
    IF jsonb_typeof(_patch->'vat_inclusive') <> 'boolean' THEN
      RAISE EXCEPTION 'CONTRACT_AUTOSAVE:INVALID_VALUE:vat_inclusive';
    END IF;
    _vat_incl := (_patch->>'vat_inclusive')::boolean;
  END IF;

  IF _patch ? 'start_date' AND jsonb_typeof(_patch->'start_date') <> 'null' THEN
    BEGIN
      _start := (_patch->>'start_date')::date;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'CONTRACT_AUTOSAVE:INVALID_VALUE:start_date';
    END;
  END IF;

  IF _patch ? 'end_date' AND jsonb_typeof(_patch->'end_date') <> 'null' THEN
    BEGIN
      _end := (_patch->>'end_date')::date;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'CONTRACT_AUTOSAVE:INVALID_VALUE:end_date';
    END;
  END IF;

  -- Apply updates explicitly per column
  UPDATE public.contracts c SET
    title_ar         = CASE WHEN _patch ? 'title_ar'         THEN NULLIF(_patch->>'title_ar','')         ELSE c.title_ar END,
    title_en         = CASE WHEN _patch ? 'title_en'         THEN _patch->>'title_en'                    ELSE c.title_en END,
    description_ar   = CASE WHEN _patch ? 'description_ar'   THEN _patch->>'description_ar'              ELSE c.description_ar END,
    description_en   = CASE WHEN _patch ? 'description_en'   THEN _patch->>'description_en'              ELSE c.description_en END,
    start_date       = CASE WHEN _patch ? 'start_date'       THEN NULLIF(_patch->>'start_date','')::date ELSE c.start_date END,
    end_date         = CASE WHEN _patch ? 'end_date'         THEN NULLIF(_patch->>'end_date','')::date   ELSE c.end_date END,
    terms_ar         = CASE WHEN _patch ? 'terms_ar'         THEN _patch->>'terms_ar'                    ELSE c.terms_ar END,
    terms_en         = CASE WHEN _patch ? 'terms_en'         THEN _patch->>'terms_en'                    ELSE c.terms_en END,
    supervisor_name  = CASE WHEN _patch ? 'supervisor_name'  THEN _patch->>'supervisor_name'             ELSE c.supervisor_name END,
    supervisor_phone = CASE WHEN _patch ? 'supervisor_phone' THEN _patch->>'supervisor_phone'            ELSE c.supervisor_phone END,
    supervisor_email = CASE WHEN _patch ? 'supervisor_email' THEN _patch->>'supervisor_email'            ELSE c.supervisor_email END,
    vat_inclusive    = CASE WHEN _patch ? 'vat_inclusive'    THEN (_patch->>'vat_inclusive')::boolean    ELSE c.vat_inclusive END,
    vat_rate         = CASE WHEN _patch ? 'vat_rate'         THEN (_patch->>'vat_rate')::numeric         ELSE c.vat_rate END,
    currency_code    = CASE WHEN _patch ? 'currency_code'    THEN _patch->>'currency_code'               ELSE c.currency_code END,
    total_amount     = CASE WHEN _patch ? 'total_amount'     THEN (_patch->>'total_amount')::numeric     ELSE c.total_amount END,
    updated_at       = now()
  WHERE c.id = _contract_id
  RETURNING updated_at INTO _new_updated_at;

  RETURN jsonb_build_object(
    'updated_at', _new_updated_at,
    'status', 'draft',
    'autosaved', true
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_contract_draft_autosave(uuid, jsonb, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_contract_draft_autosave(uuid, jsonb, timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_contract_draft_autosave(uuid, jsonb, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_contract_draft_autosave(uuid, jsonb, timestamptz) TO service_role;
