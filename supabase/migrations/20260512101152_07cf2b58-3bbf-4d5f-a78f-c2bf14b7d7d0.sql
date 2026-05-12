CREATE OR REPLACE FUNCTION public.validate_contract_line_item_pricing()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_method text := COALESCE(NEW.pricing_method, 'unit');
  v_fi jsonb := COALESCE(NEW.formula_inputs, '{}'::jsonb);
  v_res jsonb;
  v_ok boolean;
  v_code text;
  v_template_version_id uuid;
  v_rule_count integer;
  v_allowed boolean;
BEGIN
  IF jsonb_typeof(v_fi) <> 'object' THEN
    v_fi := '{}'::jsonb;
  END IF;

  -- CT5B — base pricing math + sanity checks.
  v_res := public.calculate_contract_line_item_total(v_method, NEW.quantity, NEW.unit_price, v_fi);
  v_ok := (v_res->>'ok')::boolean;
  IF NOT v_ok THEN
    v_code := COALESCE(v_res->>'error_code', 'invalid_total');
    RAISE EXCEPTION 'INVALID_LINE_ITEM_PRICING:%', v_code
      USING ERRCODE = 'P0001',
            DETAIL  = jsonb_build_object('method', v_method, 'error_code', v_code)::text;
  END IF;

  -- CT5D — template pricing-rules allow-list (only when both contract+rules exist).
  SELECT template_version_id INTO v_template_version_id
  FROM public.contracts
  WHERE id = NEW.contract_id;

  IF v_template_version_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_rule_count
    FROM public.contract_template_pricing_rules
    WHERE version_id = v_template_version_id;

    IF v_rule_count > 0 THEN
      SELECT EXISTS (
        SELECT 1 FROM public.contract_template_pricing_rules
        WHERE version_id = v_template_version_id
          AND method = v_method
      ) INTO v_allowed;

      IF NOT v_allowed THEN
        RAISE EXCEPTION 'INVALID_LINE_ITEM_PRICING:method_not_allowed_by_template'
          USING ERRCODE = 'P0001',
                DETAIL  = jsonb_build_object(
                  'method', v_method,
                  'template_version_id', v_template_version_id,
                  'error_code', 'method_not_allowed_by_template'
                )::text;
      END IF;
    END IF;
  END IF;

  NEW.total_cost := (v_res->>'total')::numeric;
  IF NEW.unit_of_measure IS NULL OR NEW.unit_of_measure = '' THEN
    NEW.unit_of_measure := v_res->>'unit_of_measure';
  END IF;
  NEW.formula_inputs := v_fi;
  RETURN NEW;
END;
$$;