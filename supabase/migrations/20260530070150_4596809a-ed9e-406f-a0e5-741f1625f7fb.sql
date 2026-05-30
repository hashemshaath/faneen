
-- 1) Party isolation CHECK constraint
ALTER TABLE public.contracts
  ADD CONSTRAINT chk_contracts_provider_ne_client
  CHECK (client_id IS NULL OR client_id <> provider_id) NOT VALID;
ALTER TABLE public.contracts VALIDATE CONSTRAINT chk_contracts_provider_ne_client;

-- 2) Admin-cannot-be-party trigger
CREATE OR REPLACE FUNCTION public.contracts_admin_party_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Only enforce when there's an authenticated caller (skip service_role/system).
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- If acting user is admin, they cannot be provider or client on this contract.
  IF public.has_admin_access(v_uid) THEN
    IF NEW.provider_id = v_uid THEN
      RAISE EXCEPTION 'admin_cannot_be_contract_provider'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.client_id IS NOT NULL AND NEW.client_id = v_uid THEN
      RAISE EXCEPTION 'admin_cannot_be_contract_client'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contracts_admin_party_guard ON public.contracts;
CREATE TRIGGER trg_contracts_admin_party_guard
  BEFORE INSERT OR UPDATE OF provider_id, client_id ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.contracts_admin_party_guard();

-- 3) Unified contract audit trail RPC
CREATE OR REPLACE FUNCTION public.get_contract_full_audit_trail(_contract_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_provider uuid;
  v_client uuid;
  v_business uuid;
  v_is_admin boolean;
  v_events jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  SELECT provider_id, client_id, business_id
    INTO v_provider, v_client, v_business
    FROM public.contracts WHERE id = _contract_id;

  IF v_provider IS NULL THEN
    RAISE EXCEPTION 'contract_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_is_admin := public.has_admin_access(v_uid);

  -- Authorization: parties (provider, client) or admin
  IF NOT v_is_admin
     AND v_uid <> v_provider
     AND (v_client IS NULL OR v_uid <> v_client)
     AND NOT EXISTS (
       SELECT 1 FROM public.businesses b
       WHERE b.id = v_business AND b.owner_id = v_uid
     )
  THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH events AS (
    -- Amendments (created/approved/rejected/applied/cancelled)
    SELECT
      'amendment'::text AS source,
      ca.created_at     AS at,
      'amendment.created'::text AS event,
      jsonb_build_object(
        'amendment_id', ca.id,
        'amendment_number', ca.amendment_number,
        'amendment_type', ca.amendment_type,
        'status', ca.status,
        'public_reason', ca.public_reason
      ) AS payload
    FROM public.contract_amendments ca
    WHERE ca.contract_id = _contract_id

    UNION ALL
    SELECT
      'amendment_audit'::text,
      caa.created_at,
      ('amendment.' || caa.action)::text,
      jsonb_build_object(
        'amendment_id', caa.amendment_id,
        'old_status', caa.old_status,
        'new_status', caa.new_status,
        'metadata', caa.metadata
      )
    FROM public.contract_amendment_audit caa
    JOIN public.contract_amendments ca ON ca.id = caa.amendment_id
    WHERE ca.contract_id = _contract_id

    UNION ALL
    -- PDF exports
    SELECT
      'pdf_export'::text,
      cpe.exported_at,
      'pdf.exported'::text,
      jsonb_build_object(
        'source', cpe.source,
        'locale', cpe.export_locale,
        'document_hash_prefix', cpe.document_hash_prefix,
        'version_number', cpe.contract_version,
        'official_version_number', cpe.official_version_number
      )
    FROM public.contract_pdf_exports cpe
    WHERE cpe.contract_id = _contract_id

    UNION ALL
    -- Contract version snapshots (lifecycle)
    SELECT
      'version'::text,
      cv.created_at,
      ('version.' || cv.kind)::text,
      jsonb_build_object(
        'version_number', cv.version_number,
        'kind', cv.kind,
        'document_hash_prefix', LEFT(COALESCE(cv.document_hash, ''), 16),
        'amendment_id', cv.amendment_id
      )
    FROM public.contract_versions cv
    WHERE cv.contract_id = _contract_id

    UNION ALL
    -- Generic business audit log entries scoped to this contract
    SELECT
      'audit_log'::text,
      bal.created_at,
      bal.action::text,
      jsonb_build_object(
        'changes', bal.changes,
        'metadata', bal.metadata
      )
    FROM public.business_audit_log bal
    WHERE bal.entity_type = 'contract' AND bal.entity_id = _contract_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'source', source,
        'at', at,
        'event', event,
        'payload', payload
      ) ORDER BY at DESC
    ),
    '[]'::jsonb
  )
  INTO v_events
  FROM events;

  RETURN v_events;
END;
$$;

REVOKE ALL ON FUNCTION public.get_contract_full_audit_trail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_contract_full_audit_trail(uuid) TO authenticated, service_role;

-- 4) Admin creates contract on behalf (admin cannot be a party)
CREATE OR REPLACE FUNCTION public.admin_create_contract_on_behalf(
  _provider_id uuid,
  _client_id uuid,
  _title_ar text,
  _title_en text DEFAULT NULL,
  _total_amount numeric DEFAULT 0,
  _currency_code text DEFAULT 'SAR',
  _start_date date DEFAULT NULL,
  _end_date date DEFAULT NULL,
  _description_ar text DEFAULT NULL,
  _description_en text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_contract_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_admin_access(v_uid) THEN
    RAISE EXCEPTION 'forbidden_admin_only' USING ERRCODE = '42501';
  END IF;
  IF _provider_id IS NULL OR _client_id IS NULL THEN
    RAISE EXCEPTION 'provider_and_client_required' USING ERRCODE = '22023';
  END IF;
  IF _provider_id = _client_id THEN
    RAISE EXCEPTION 'provider_cannot_equal_client' USING ERRCODE = '22023';
  END IF;
  IF _provider_id = v_uid OR _client_id = v_uid THEN
    RAISE EXCEPTION 'admin_cannot_be_party' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(TRIM(_title_ar), '') = '' THEN
    RAISE EXCEPTION 'title_ar_required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.contracts (
    provider_id, client_id, title_ar, title_en,
    description_ar, description_en,
    total_amount, currency_code, status,
    start_date, end_date,
    vat_inclusive, vat_rate
  ) VALUES (
    _provider_id, _client_id, _title_ar, _title_en,
    _description_ar, _description_en,
    COALESCE(_total_amount, 0), COALESCE(_currency_code, 'SAR'), 'draft',
    _start_date, _end_date,
    true, 15
  )
  RETURNING id INTO v_contract_id;

  INSERT INTO public.business_audit_log (
    business_id, actor_id, entity_type, entity_id, action, changes, metadata
  ) VALUES (
    NULL, v_uid, 'contract', v_contract_id, 'contract.admin_created_on_behalf',
    jsonb_build_object('provider_id', _provider_id, 'client_id', _client_id),
    jsonb_build_object('by_admin', true)
  );

  RETURN v_contract_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_contract_on_behalf(
  uuid, uuid, text, text, numeric, text, date, date, text, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_contract_on_behalf(
  uuid, uuid, text, text, numeric, text, date, date, text, text
) TO authenticated, service_role;

-- 5) Documentation
COMMENT ON TABLE public.legacy_contract_normalization_log IS
  'Historical CT8 contract-normalization migration log. Read-only — kept for audit reference only; no runtime code depends on this.';
COMMENT ON CONSTRAINT chk_contracts_provider_ne_client ON public.contracts IS
  'Provider and client must be distinct users — a person cannot contract with themselves.';
COMMENT ON FUNCTION public.contracts_admin_party_guard() IS
  'Enforces: an admin user (has_admin_access) cannot insert or update a contract row where they are the provider or the client.';
COMMENT ON FUNCTION public.get_contract_full_audit_trail(uuid) IS
  'Unified audit timeline across contract_amendments, contract_amendment_audit, contract_pdf_exports, contract_versions, and business_audit_log. Visible to contract parties and admins only.';
COMMENT ON FUNCTION public.admin_create_contract_on_behalf(uuid, uuid, text, text, numeric, text, date, date, text, text) IS
  'Admin-only: creates a draft contract between two other users. Rejects if admin is provider or client, or if provider = client.';
