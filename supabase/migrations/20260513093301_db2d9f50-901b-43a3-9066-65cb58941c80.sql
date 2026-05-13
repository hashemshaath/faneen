
-- Part A: contract columns
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS execution_site_id uuid NULL
    REFERENCES public.client_sites(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS execution_address_snapshot jsonb NULL,
  ADD COLUMN IF NOT EXISTS source_lead_id uuid NULL
    REFERENCES public.lead_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_execution_site ON public.contracts(execution_site_id);
CREATE INDEX IF NOT EXISTS idx_contracts_source_lead ON public.contracts(source_lead_id);

-- Part B: snapshot helper
CREATE OR REPLACE FUNCTION public.build_execution_address_snapshot(_site_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_s public.client_sites%ROWTYPE;
BEGIN
  IF _site_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_s FROM public.client_sites WHERE id = _site_id;
  IF v_s.id IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_SITE:SITE_NOT_FOUND';
  END IF;

  RETURN jsonb_build_object(
    'site_id',       v_s.id,
    'label',         v_s.label,
    'contact_name',  v_s.contact_name,
    'contact_phone', v_s.contact_phone,
    'city_id',       v_s.city_id,
    'city_name',     v_s.city_name,
    'district',      v_s.district,
    'address_line1', v_s.address_line1,
    'address_line2', v_s.address_line2,
    'map_url',       v_s.map_url,
    'latitude',      v_s.latitude,
    'longitude',     v_s.longitude,
    'access_notes',  v_s.access_notes,
    'captured_at',   now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.build_execution_address_snapshot(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.build_execution_address_snapshot(uuid) TO authenticated, service_role;

-- Part C: setter RPC
CREATE OR REPLACE FUNCTION public.set_contract_execution_site(
  _contract_id uuid,
  _site_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_c public.contracts%ROWTYPE;
  v_s public.client_sites%ROWTYPE;
  v_snap jsonb;
  v_currently_linked boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_SITE:UNAUTHENTICATED';
  END IF;

  SELECT * INTO v_c FROM public.contracts WHERE id = _contract_id;
  IF v_c.id IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_SITE:CONTRACT_NOT_FOUND';
  END IF;

  v_is_admin := has_role(v_uid, 'admin'::app_role) OR has_role(v_uid, 'super_admin'::app_role);

  IF v_c.provider_id <> v_uid AND NOT v_is_admin THEN
    RAISE EXCEPTION 'CONTRACT_SITE:FORBIDDEN';
  END IF;

  IF v_c.status NOT IN ('draft'::contract_status, 'pending_approval'::contract_status) THEN
    RAISE EXCEPTION 'CONTRACT_SITE:LOCKED';
  END IF;

  IF _site_id IS NULL THEN
    UPDATE public.contracts
       SET execution_site_id = NULL,
           execution_address_snapshot = NULL
     WHERE id = _contract_id;
    RETURN jsonb_build_object(
      'contract_id', _contract_id,
      'execution_site_id', NULL,
      'execution_address_snapshot', NULL
    );
  END IF;

  SELECT * INTO v_s FROM public.client_sites WHERE id = _site_id;
  IF v_s.id IS NULL THEN
    RAISE EXCEPTION 'CONTRACT_SITE:SITE_NOT_FOUND';
  END IF;

  v_currently_linked := (v_c.execution_site_id IS NOT NULL AND v_c.execution_site_id = _site_id);

  IF v_s.archived_at IS NOT NULL AND NOT v_currently_linked THEN
    RAISE EXCEPTION 'CONTRACT_SITE:SITE_ARCHIVED';
  END IF;

  IF v_s.business_id <> v_c.business_id THEN
    RAISE EXCEPTION 'CONTRACT_SITE:BUSINESS_MISMATCH';
  END IF;

  IF v_s.client_user_id IS NOT NULL
     AND v_c.client_id IS NOT NULL
     AND v_s.client_user_id <> v_c.client_id THEN
    RAISE EXCEPTION 'CONTRACT_SITE:CLIENT_MISMATCH';
  END IF;

  v_snap := public.build_execution_address_snapshot(_site_id);

  UPDATE public.contracts
     SET execution_site_id = _site_id,
         execution_address_snapshot = v_snap
   WHERE id = _contract_id;

  RETURN jsonb_build_object(
    'contract_id', _contract_id,
    'execution_site_id', _site_id,
    'execution_address_snapshot', v_snap
  );
END;
$$;

REVOKE ALL ON FUNCTION public.set_contract_execution_site(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_contract_execution_site(uuid, uuid) TO authenticated, service_role;

-- Part D: snapshot-on-activation guard (BEFORE UPDATE).
-- Fires after lock_guard alphabetically only when OLD is unlocked transitioning to active,
-- so it only ever populates a missing snapshot at lock time and never mutates existing ones.
CREATE OR REPLACE FUNCTION public.contracts_snapshot_on_activation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_becomes_locked boolean;
BEGIN
  v_becomes_locked :=
    (NEW.status IN ('active'::contract_status,'completed'::contract_status,'cancelled'::contract_status,'disputed'::contract_status)
       AND OLD.status IS DISTINCT FROM NEW.status)
    OR (NEW.locked_at IS NOT NULL AND OLD.locked_at IS NULL);

  IF v_becomes_locked
     AND NEW.execution_site_id IS NOT NULL
     AND NEW.execution_address_snapshot IS NULL THEN
    BEGIN
      NEW.execution_address_snapshot := public.build_execution_address_snapshot(NEW.execution_site_id);
    EXCEPTION WHEN OTHERS THEN
      -- Never block activation if snapshot fails; leave null and continue.
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_snapshot_on_activation ON public.contracts;
CREATE TRIGGER trg_contracts_snapshot_on_activation
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.contracts_snapshot_on_activation();

-- Part E: clone update — reuse site id when still valid for same business,
-- always take a fresh snapshot; never copy stale snapshot.
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
  v_site public.client_sites%ROWTYPE;
  v_clone_site_id uuid := NULL;
  v_clone_site_snap jsonb := NULL;
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

  IF v_src.template_version_id IS NOT NULL THEN
    SELECT status INTO v_tpl_status
    FROM contract_template_versions
    WHERE id = v_src.template_version_id;

    IF v_tpl_status IS NULL OR v_tpl_status <> 'published' THEN
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

  SELECT COUNT(*) INTO v_src_li_count
  FROM contract_line_items WHERE contract_id = _source_contract_id;

  IF _include_line_items THEN
    v_initial_total := 0;
  ELSE
    IF v_src_li_count = 0
       AND (v_src.pricing_method IS NULL OR v_src.pricing_method = 'lump_sum') THEN
      v_initial_total := COALESCE(v_src.total_amount, 0);
    ELSE
      v_initial_total := 0;
    END IF;
  END IF;

  -- Site reuse: only if site still exists, same business, not archived.
  IF v_src.execution_site_id IS NOT NULL THEN
    SELECT * INTO v_site FROM public.client_sites WHERE id = v_src.execution_site_id;
    IF v_site.id IS NOT NULL
       AND v_site.archived_at IS NULL
       AND v_site.business_id = v_src.business_id THEN
      v_clone_site_id := v_site.id;
      v_clone_site_snap := public.build_execution_address_snapshot(v_site.id);
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
    template_version_id, service_category_id, pricing_method,
    execution_site_id, execution_address_snapshot
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
    v_src.template_version_id, v_src.service_category_id, v_src.pricing_method,
    v_clone_site_id, v_clone_site_snap
  )
  RETURNING id, contract_number INTO v_new_id, v_new_number;

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
