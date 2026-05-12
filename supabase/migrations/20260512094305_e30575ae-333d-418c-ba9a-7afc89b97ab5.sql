-- CT4: SECURITY DEFINER RPCs for atomic contract+snapshot creation and template change.

CREATE OR REPLACE FUNCTION public._build_template_snapshot_payload(_version_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'template', (
      SELECT to_jsonb(t.*) FROM contract_templates t
      JOIN contract_template_versions v ON v.template_id = t.id
      WHERE v.id = _version_id
    ),
    'version', (SELECT to_jsonb(v.*) FROM contract_template_versions v WHERE v.id = _version_id),
    'sections', COALESCE((
      SELECT jsonb_agg(
        to_jsonb(s.*) || jsonb_build_object(
          'clauses', COALESCE((
            SELECT jsonb_agg(to_jsonb(c.*) ORDER BY c.sort_order)
            FROM contract_template_clauses c WHERE c.section_id = s.id
          ), '[]'::jsonb)
        )
        ORDER BY s.sort_order
      )
      FROM contract_template_sections s WHERE s.version_id = _version_id
    ), '[]'::jsonb),
    'pricing_rules', COALESCE((
      SELECT jsonb_agg(to_jsonb(p.*)) FROM contract_template_pricing_rules p WHERE p.version_id = _version_id
    ), '[]'::jsonb),
    'required_fields', COALESCE((
      SELECT jsonb_agg(to_jsonb(r.*) ORDER BY r.sort_order)
      FROM contract_template_required_fields r WHERE r.version_id = _version_id
    ), '[]'::jsonb),
    'attachments', COALESCE((
      SELECT jsonb_agg(to_jsonb(a.*) ORDER BY a.precedence_order)
      FROM contract_template_attachments a WHERE a.version_id = _version_id
    ), '[]'::jsonb),
    'frozen_at', now()
  );
$$;

REVOKE ALL ON FUNCTION public._build_template_snapshot_payload(uuid) FROM PUBLIC;

-- Atomic contract creation from a published template version.
CREATE OR REPLACE FUNCTION public.create_contract_from_template(
  _payload jsonb,
  _template_version_id uuid,
  _pricing_method text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
  v_snapshot_id uuid;
  v_template_id uuid;
  v_service_category_id uuid;
  v_status text;
  v_provider_id uuid;
  v_client_id uuid;
  v_payload jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'unauthenticated';
  END IF;

  IF _template_version_id IS NULL THEN
    RAISE EXCEPTION 'template_version_id_required';
  END IF;

  SELECT v.status, v.template_id, t.service_category_id
    INTO v_status, v_template_id, v_service_category_id
  FROM contract_template_versions v
  JOIN contract_templates t ON t.id = v.template_id
  WHERE v.id = _template_version_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'template_version_not_found';
  END IF;
  IF v_status <> 'published' THEN
    RAISE EXCEPTION 'template_version_not_published';
  END IF;

  v_provider_id := NULLIF(_payload->>'provider_id','')::uuid;
  v_client_id := NULLIF(_payload->>'client_id','')::uuid;

  IF v_provider_id IS NULL OR v_client_id IS NULL THEN
    RAISE EXCEPTION 'provider_and_client_required';
  END IF;

  -- Caller must be the provider OR admin
  IF v_provider_id <> auth.uid()
     AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden_provider_mismatch';
  END IF;

  v_payload := _payload
    || jsonb_build_object(
         'template_version_id', _template_version_id,
         'service_category_id', COALESCE(NULLIF(_payload->>'service_category_id','')::uuid, v_service_category_id),
         'pricing_method', _pricing_method,
         'status', COALESCE(NULLIF(_payload->>'status',''), 'draft')
       );

  -- Insert contract
  INSERT INTO contracts (
    provider_id, client_id, business_id,
    title_ar, title_en, description_ar, description_en,
    total_amount, currency_code, start_date, end_date,
    terms_ar, terms_en,
    supervisor_name, supervisor_phone, supervisor_email,
    status, vat_inclusive, vat_rate,
    template_version_id, service_category_id, pricing_method
  )
  VALUES (
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
    _pricing_method
  )
  RETURNING id INTO v_contract_id;

  -- Create immutable snapshot
  INSERT INTO contract_template_snapshots (contract_id, version_id, frozen_payload, created_by)
  VALUES (
    v_contract_id,
    _template_version_id,
    public._build_template_snapshot_payload(_template_version_id),
    auth.uid()
  )
  RETURNING id INTO v_snapshot_id;

  UPDATE contracts SET template_snapshot_id = v_snapshot_id WHERE id = v_contract_id;

  RETURN v_contract_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_contract_from_template(jsonb, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_contract_from_template(jsonb, uuid, text) TO authenticated;

-- Re-snapshot template on a draft contract (only while draft, no approval started).
CREATE OR REPLACE FUNCTION public.set_contract_template(
  _contract_id uuid,
  _template_version_id uuid,
  _pricing_method text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_provider_id uuid;
  v_template_id uuid;
  v_service_category_id uuid;
  v_version_status text;
  v_snapshot_id uuid;
  v_old_snapshot_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT status, provider_id, template_snapshot_id
    INTO v_status, v_provider_id, v_old_snapshot_id
  FROM contracts WHERE id = _contract_id;

  IF v_status IS NULL THEN RAISE EXCEPTION 'contract_not_found'; END IF;
  IF v_status <> 'draft' THEN RAISE EXCEPTION 'contract_not_draft'; END IF;

  IF v_provider_id <> auth.uid()
     AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT v.status, v.template_id, t.service_category_id
    INTO v_version_status, v_template_id, v_service_category_id
  FROM contract_template_versions v
  JOIN contract_templates t ON t.id = v.template_id
  WHERE v.id = _template_version_id;

  IF v_version_status IS NULL THEN RAISE EXCEPTION 'template_version_not_found'; END IF;
  IF v_version_status <> 'published' THEN RAISE EXCEPTION 'template_version_not_published'; END IF;

  -- Replace snapshot: delete old, insert new (snapshot is one-to-one on contract_id).
  IF v_old_snapshot_id IS NOT NULL THEN
    -- Detach FK first to avoid the version_delete guard issues.
    UPDATE contracts SET template_snapshot_id = NULL WHERE id = _contract_id;
    DELETE FROM contract_template_snapshots WHERE id = v_old_snapshot_id;
  END IF;

  INSERT INTO contract_template_snapshots (contract_id, version_id, frozen_payload, created_by)
  VALUES (_contract_id, _template_version_id, public._build_template_snapshot_payload(_template_version_id), auth.uid())
  RETURNING id INTO v_snapshot_id;

  UPDATE contracts
    SET template_version_id = _template_version_id,
        template_snapshot_id = v_snapshot_id,
        service_category_id = COALESCE(service_category_id, v_service_category_id),
        pricing_method = COALESCE(_pricing_method, pricing_method)
  WHERE id = _contract_id;

  RETURN v_snapshot_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_contract_template(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_contract_template(uuid, uuid, text) TO authenticated;

-- Immutability guard: snapshots cannot be updated once created.
CREATE OR REPLACE FUNCTION public.trg_block_snapshot_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'contract_template_snapshots are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_cts_snap_block_update ON public.contract_template_snapshots;
CREATE TRIGGER trg_cts_snap_block_update
  BEFORE UPDATE ON public.contract_template_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.trg_block_snapshot_update();