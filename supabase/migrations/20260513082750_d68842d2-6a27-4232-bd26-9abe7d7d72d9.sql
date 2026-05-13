CREATE OR REPLACE FUNCTION public.clone_contract_as_draft(
  _source_contract_id uuid,
  _include_line_items boolean DEFAULT true,
  _include_terms boolean DEFAULT true,
  _include_supervisor boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_src contracts%ROWTYPE;
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_new_id uuid;
  v_new_number text;
  v_snapshot_id uuid;
  v_title_ar text;
  v_title_en text;
  v_terms_ar text;
  v_terms_en text;
  v_sup_name text;
  v_sup_phone text;
  v_sup_email text;
  v_tpl_status text;
  v_src_li_count int := 0;
  v_new_li_count int := 0;
  v_recomputed_total numeric;
  v_initial_total numeric;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'CLONE_CONTRACT:UNAUTHENTICATED';
  END IF;

  SELECT * INTO v_src FROM contracts WHERE id = _source_contract_id;
  IF v_src.id IS NULL THEN
    RAISE EXCEPTION 'CLONE_CONTRACT:NOT_FOUND';
  END IF;

  v_is_admin := has_role(v_uid, 'admin'::app_role) OR has_role(v_uid, 'super_admin'::app_role);

  IF v_src.provider_id <> v_uid AND NOT v_is_admin THEN
    RAISE EXCEPTION 'CLONE_CONTRACT:FORBIDDEN';
  END IF;

  -- Part C: template safety. Fail clearly rather than silently swap legal template.
  IF v_src.template_version_id IS NOT NULL THEN
    SELECT status INTO v_tpl_status
    FROM contract_template_versions
    WHERE id = v_src.template_version_id;

    IF v_tpl_status IS NULL THEN
      RAISE EXCEPTION 'CLONE_CONTRACT:TEMPLATE_UNAVAILABLE';
    END IF;
    IF v_tpl_status <> 'published' THEN
      RAISE EXCEPTION 'CLONE_CONTRACT:TEMPLATE_UNAVAILABLE';
    END IF;
  END IF;

  v_title_ar := 'نسخة من ' || COALESCE(v_src.title_ar, '');
  v_title_en := CASE WHEN v_src.title_en IS NOT NULL AND length(v_src.title_en) > 0
                     THEN 'Copy of ' || v_src.title_en ELSE NULL END;

  IF _include_terms THEN
    v_terms_ar := v_src.terms_ar;
    v_terms_en := v_src.terms_en;
  END IF;

  IF _include_supervisor THEN
    v_sup_name := v_src.supervisor_name;
    v_sup_phone := v_src.supervisor_phone;
    v_sup_email := v_src.supervisor_email;
  END IF;

  -- Part A: pre-compute initial total. We will recompute after line-item copy
  -- so the cloned draft never carries a historical total without the basis.
  SELECT COUNT(*) INTO v_src_li_count
  FROM contract_line_items WHERE contract_id = _source_contract_id;

  IF _include_line_items THEN
    -- start at 0; will be replaced by SUM(total_cost) after copy
    v_initial_total := 0;
  ELSE
    -- Without line items: only preserve the source total when the source had
    -- no line items AND uses lump_sum / null pricing (manual / lump basis).
    IF v_src_li_count = 0
       AND (v_src.pricing_method IS NULL OR v_src.pricing_method = 'lump_sum') THEN
      v_initial_total := COALESCE(v_src.total_amount, 0);
    ELSE
      v_initial_total := 0;
    END IF;
  END IF;

  INSERT INTO contracts (
    provider_id, client_id, business_id,
    title_ar, title_en,
    description_ar, description_en,
    total_amount, currency_code,
    start_date, end_date,
    terms_ar, terms_en,
    supervisor_name, supervisor_phone, supervisor_email,
    status, vat_inclusive, vat_rate,
    template_version_id, service_category_id, pricing_method
  ) VALUES (
    v_src.provider_id, v_src.client_id, v_src.business_id,
    v_title_ar, v_title_en,
    v_src.description_ar, v_src.description_en,
    v_initial_total, COALESCE(v_src.currency_code, 'SAR'),
    v_src.start_date, v_src.end_date,
    v_terms_ar, v_terms_en,
    v_sup_name, v_sup_phone, v_sup_email,
    'draft'::contract_status,
    COALESCE(v_src.vat_inclusive, false), COALESCE(v_src.vat_rate, 15),
    v_src.template_version_id, v_src.service_category_id, v_src.pricing_method
  )
  RETURNING id, contract_number INTO v_new_id, v_new_number;

  -- Part B: snapshot. Inner BEGIN re-raises a structured code; the outer
  -- function transaction rolls back the just-inserted contract row.
  IF v_src.template_version_id IS NOT NULL THEN
    BEGIN
      INSERT INTO contract_template_snapshots (contract_id, version_id, frozen_payload, created_by)
      VALUES (
        v_new_id,
        v_src.template_version_id,
        public._build_template_snapshot_payload(v_src.template_version_id),
        v_uid
      )
      RETURNING id INTO v_snapshot_id;

      UPDATE contracts SET template_snapshot_id = v_snapshot_id WHERE id = v_new_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'CLONE_CONTRACT:SNAPSHOT_FAILED';
    END;
  END IF;

  -- Part D: line items + count verification + total recompute.
  IF _include_line_items THEN
    BEGIN
      INSERT INTO contract_line_items (
        contract_id, name_ar, name_en, description_ar,
        quantity, unit_price, item_type, sort_order,
        pricing_method, unit_of_measure, formula_inputs, boq_group_key, is_optional
      )
      SELECT
        v_new_id, name_ar, name_en, description_ar,
        quantity, unit_price, item_type, sort_order,
        pricing_method, unit_of_measure, formula_inputs, boq_group_key, is_optional
      FROM contract_line_items
      WHERE contract_id = _source_contract_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'CLONE_CONTRACT:LINE_ITEM_COPY_FAILED';
    END;

    SELECT COUNT(*) INTO v_new_li_count
    FROM contract_line_items WHERE contract_id = v_new_id;

    IF v_new_li_count <> v_src_li_count THEN
      RAISE EXCEPTION 'CLONE_CONTRACT:LINE_ITEM_COPY_FAILED';
    END IF;

    -- Recompute total from server-authoritative total_cost values
    SELECT COALESCE(SUM(total_cost), 0) INTO v_recomputed_total
    FROM contract_line_items WHERE contract_id = v_new_id;

    UPDATE contracts SET total_amount = v_recomputed_total WHERE id = v_new_id;
  END IF;

  RETURN jsonb_build_object(
    'contract_id', v_new_id,
    'contract_number', v_new_number,
    'status', 'draft',
    'cloned', true
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.clone_contract_as_draft(uuid, boolean, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clone_contract_as_draft(uuid, boolean, boolean, boolean) TO authenticated, service_role;