-- ============================================================
-- CT5B — Server-side pricing validation for contract_line_items
-- Additive: legacy rows (pricing_method NULL) keep working as 'unit'.
-- ============================================================

-- ---------- Part A: pure calculation helper ----------
CREATE OR REPLACE FUNCTION public.calculate_contract_line_item_total(
  _pricing_method text,
  _quantity numeric,
  _unit_price numeric,
  _formula_inputs jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_method text := COALESCE(NULLIF(_pricing_method, ''), 'unit');
  v_qty numeric := COALESCE(_quantity, 1);
  v_price numeric := COALESCE(_unit_price, 0);
  v_inputs jsonb := COALESCE(_formula_inputs, '{}'::jsonb);
  v_length numeric;
  v_width  numeric;
  v_height numeric;
  v_w_kg   numeric;
  v_w_ton  numeric;
  v_amount numeric;
  v_total  numeric := 0;
  v_uom    text := 'pcs';

  -- Caps must mirror src/lib/contract-pricing.ts (CT5A).
  c_max_dim     constant numeric := 1000000000;       -- 1e9 mm
  c_max_qty     constant numeric := 1000000;          -- 1e6
  c_max_weight  constant numeric := 1000000;          -- 1e6
  c_max_price   constant numeric := 1000000000;       -- 1e9
  c_max_total   constant numeric := 1000000000000;    -- 1e12
BEGIN
  -- Numeric sanity (NaN / Infinity already coerced by jsonb->numeric cast).
  IF v_qty IS NULL OR v_price IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'invalid_number');
  END IF;
  IF v_qty < 0 OR v_price < 0 THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'negative_value');
  END IF;
  IF v_qty > c_max_qty OR v_price > c_max_price THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'value_too_large');
  END IF;

  -- Pull dimension/weight/amount inputs safely.
  BEGIN
    v_length := NULLIF(v_inputs->>'length_mm','')::numeric;
    v_width  := NULLIF(v_inputs->>'width_mm','')::numeric;
    v_height := NULLIF(v_inputs->>'height_mm','')::numeric;
    v_w_kg   := NULLIF(v_inputs->>'weight_kg','')::numeric;
    v_w_ton  := NULLIF(v_inputs->>'weight_ton','')::numeric;
    v_amount := NULLIF(v_inputs->>'amount','')::numeric;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'invalid_number');
  END;

  -- Generic guards on present inputs.
  IF (v_length IS NOT NULL AND (v_length < 0 OR v_length > c_max_dim))
     OR (v_width  IS NOT NULL AND (v_width  < 0 OR v_width  > c_max_dim))
     OR (v_height IS NOT NULL AND (v_height < 0 OR v_height > c_max_dim)) THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom,
      'error_code', CASE
        WHEN v_length IS NOT NULL AND v_length < 0 THEN 'negative_value'
        WHEN v_width  IS NOT NULL AND v_width  < 0 THEN 'negative_value'
        WHEN v_height IS NOT NULL AND v_height < 0 THEN 'negative_value'
        ELSE 'value_too_large' END);
  END IF;
  IF (v_w_kg IS NOT NULL AND (v_w_kg < 0 OR v_w_kg > c_max_weight))
     OR (v_w_ton IS NOT NULL AND (v_w_ton < 0 OR v_w_ton > c_max_weight)) THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom,
      'error_code', CASE WHEN COALESCE(v_w_kg, v_w_ton) < 0 THEN 'negative_value' ELSE 'value_too_large' END);
  END IF;
  IF v_amount IS NOT NULL AND (v_amount < 0 OR v_amount > c_max_price) THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom,
      'error_code', CASE WHEN v_amount < 0 THEN 'negative_value' ELSE 'value_too_large' END);
  END IF;

  -- Compute by method.
  CASE v_method
    WHEN 'unit' THEN
      v_uom := 'pcs';
      v_total := v_qty * v_price;

    WHEN 'linear_meter' THEN
      v_uom := 'm';
      IF v_length IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'missing_length');
      END IF;
      v_total := (v_length / 1000.0) * v_qty * v_price;

    WHEN 'square_meter' THEN
      v_uom := 'm²';
      IF v_length IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'missing_length');
      END IF;
      IF v_width IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'missing_width');
      END IF;
      v_total := (v_length * v_width / 1000000.0) * v_qty * v_price;

    WHEN 'cubic_meter' THEN
      v_uom := 'm³';
      IF v_length IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'missing_length');
      END IF;
      IF v_width IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'missing_width');
      END IF;
      IF v_height IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'missing_height');
      END IF;
      v_total := (v_length * v_width * v_height / 1000000000.0) * v_qty * v_price;

    WHEN 'kilogram' THEN
      v_uom := 'kg';
      IF v_w_kg IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'missing_weight');
      END IF;
      v_total := v_w_kg * v_price;

    WHEN 'ton' THEN
      v_uom := 't';
      IF v_w_ton IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'missing_weight');
      END IF;
      v_total := v_w_ton * v_price;

    WHEN 'lump_sum' THEN
      v_uom := '—';
      v_total := COALESCE(v_amount, v_price, 0);

    ELSE
      RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'unsupported_method');
  END CASE;

  IF v_total IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'invalid_total');
  END IF;
  IF v_total < 0 THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'negative_value');
  END IF;
  IF v_total > c_max_total THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'unit_of_measure', v_uom, 'error_code', 'value_too_large');
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'total', round(v_total::numeric, 2),
    'unit_of_measure', v_uom
  );
END;
$$;

-- ---------- Part C: dry-run RPC ----------
CREATE OR REPLACE FUNCTION public.validate_contract_line_item_price(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_method text;
  v_qty    numeric;
  v_price  numeric;
  v_fi     jsonb;
BEGIN
  IF _payload IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'total', 0, 'error_code', 'invalid_number');
  END IF;
  v_method := _payload->>'pricing_method';
  v_qty    := NULLIF(_payload->>'quantity','')::numeric;
  v_price  := NULLIF(_payload->>'unit_price','')::numeric;
  v_fi     := COALESCE(_payload->'formula_inputs', '{}'::jsonb);
  RETURN public.calculate_contract_line_item_total(v_method, v_qty, v_price, v_fi);
EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('ok', false, 'total', 0, 'error_code', 'invalid_number');
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_contract_line_item_price(jsonb) TO authenticated, anon;

-- ---------- Part B: BEFORE INSERT/UPDATE trigger ----------
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
BEGIN
  IF jsonb_typeof(v_fi) <> 'object' THEN
    v_fi := '{}'::jsonb;
  END IF;

  v_res := public.calculate_contract_line_item_total(v_method, NEW.quantity, NEW.unit_price, v_fi);
  v_ok := (v_res->>'ok')::boolean;

  IF NOT v_ok THEN
    v_code := COALESCE(v_res->>'error_code', 'invalid_total');
    RAISE EXCEPTION 'INVALID_LINE_ITEM_PRICING:%', v_code
      USING ERRCODE = 'P0001',
            DETAIL  = jsonb_build_object('method', v_method, 'error_code', v_code)::text;
  END IF;

  NEW.total_cost := (v_res->>'total')::numeric;
  IF NEW.unit_of_measure IS NULL OR NEW.unit_of_measure = '' THEN
    NEW.unit_of_measure := v_res->>'unit_of_measure';
  END IF;
  NEW.formula_inputs := v_fi;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_contract_line_item_pricing ON public.contract_line_items;
CREATE TRIGGER trg_validate_contract_line_item_pricing
BEFORE INSERT OR UPDATE OF pricing_method, quantity, unit_price, formula_inputs, total_cost, unit_of_measure
ON public.contract_line_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_contract_line_item_pricing();