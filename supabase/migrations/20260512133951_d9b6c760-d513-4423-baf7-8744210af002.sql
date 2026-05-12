
-- PDF-QA2C: Retention policy for contract PDF export history (additive, reversible).

-- Part A — retention fields
ALTER TABLE public.contract_pdf_exports
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS retention_policy_months integer,
  ADD COLUMN IF NOT EXISTS archived_reason text;

CREATE INDEX IF NOT EXISTS idx_cpe_retention_expires_at
  ON public.contract_pdf_exports(retention_expires_at)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cpe_archived_at
  ON public.contract_pdf_exports(archived_at);

-- Part A/B — record_contract_pdf_export now stamps default 24-month retention
CREATE OR REPLACE FUNCTION public.record_contract_pdf_export(
  _contract_id uuid,
  _source text DEFAULT 'unknown',
  _export_locale text DEFAULT NULL
)
RETURNS TABLE (
  export_id uuid,
  exported_at timestamptz,
  contract_number text,
  document_hash_prefix text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Default retention. Admin-configurable UI is future scope.
  DEFAULT_RETENTION_MONTHS constant integer := 24;
  v_uid uuid := auth.uid();
  v_is_admin boolean;
  v_contract record;
  v_tpl record;
  v_amend_count int := 0;
  v_line_count int := 0;
  v_boq_count int := 0;
  v_doc_prefix text;
  v_source text;
  v_export_id uuid;
  v_exported_at timestamptz;
  v_retention_expires_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '42501';
  END IF;

  v_source := COALESCE(_source, 'unknown');
  IF v_source NOT IN ('contract_detail','dashboard_contracts','admin','unknown') THEN
    v_source := 'unknown';
  END IF;

  v_is_admin :=
    public.has_role(v_uid, 'admin'::app_role)
    OR public.has_role(v_uid, 'super_admin'::app_role);

  SELECT id, contract_number, status::text AS status, contract_version,
         official_version_number, document_hash, template_version_id,
         client_id, provider_id
    INTO v_contract
    FROM public.contracts
   WHERE id = _contract_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONTRACT_NOT_FOUND' USING ERRCODE = '42704';
  END IF;

  IF NOT v_is_admin
     AND v_contract.client_id <> v_uid
     AND v_contract.provider_id <> v_uid THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  IF v_contract.template_version_id IS NOT NULL THEN
    SELECT ctv.id AS version_id,
           ctv.version_number,
           ct.name_ar,
           ct.name_en
      INTO v_tpl
      FROM public.contract_template_versions ctv
      LEFT JOIN public.contract_templates ct ON ct.id = ctv.template_id
     WHERE ctv.id = v_contract.template_version_id;
  END IF;

  SELECT count(*) INTO v_amend_count
    FROM public.contract_amendments WHERE contract_id = _contract_id;

  SELECT count(*) INTO v_line_count
    FROM public.contract_line_items WHERE contract_id = _contract_id;

  SELECT count(DISTINCT boq_group_key)
    INTO v_boq_count
    FROM public.contract_line_items
   WHERE contract_id = _contract_id AND boq_group_key IS NOT NULL;

  v_doc_prefix := CASE
    WHEN v_contract.document_hash IS NOT NULL AND length(v_contract.document_hash) >= 16
      THEN substring(v_contract.document_hash FROM 1 FOR 16)
    ELSE NULL
  END;

  v_retention_expires_at := now() + make_interval(months => DEFAULT_RETENTION_MONTHS);

  INSERT INTO public.contract_pdf_exports (
    contract_id, exported_by, source,
    contract_number, contract_status,
    contract_version, official_version_number,
    document_hash, document_hash_prefix,
    template_version_id, template_version_number,
    template_name_ar, template_name_en,
    has_amendments, amendment_count,
    line_item_count, boq_group_count,
    export_locale,
    retention_policy_months, retention_expires_at
  )
  VALUES (
    _contract_id, v_uid, v_source,
    v_contract.contract_number, v_contract.status,
    v_contract.contract_version, v_contract.official_version_number,
    v_contract.document_hash, v_doc_prefix,
    v_contract.template_version_id, v_tpl.version_number,
    v_tpl.name_ar, v_tpl.name_en,
    (v_amend_count > 0), v_amend_count,
    v_line_count, v_boq_count,
    NULLIF(_export_locale, ''),
    DEFAULT_RETENTION_MONTHS, v_retention_expires_at
  )
  RETURNING id, contract_pdf_exports.exported_at
  INTO v_export_id, v_exported_at;

  RETURN QUERY SELECT v_export_id, v_exported_at, v_contract.contract_number, v_doc_prefix;
END;
$$;

-- Part C — Admin-only archive RPC (does NOT delete rows).
CREATE OR REPLACE FUNCTION public.archive_expired_contract_pdf_exports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer := 0;
BEGIN
  -- Allow when called by admin/super_admin OR by service role (no auth.uid()).
  IF v_uid IS NOT NULL
     AND NOT (public.has_role(v_uid, 'admin'::app_role)
              OR public.has_role(v_uid, 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED' USING ERRCODE = '42501';
  END IF;

  WITH upd AS (
    UPDATE public.contract_pdf_exports
       SET archived_at = now(),
           archived_reason = 'retention_expired'
     WHERE archived_at IS NULL
       AND retention_expires_at IS NOT NULL
       AND retention_expires_at < now()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.archive_expired_contract_pdf_exports() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.archive_expired_contract_pdf_exports() TO authenticated, service_role;

-- Part D — list_contract_pdf_exports: hide archived rows by default.
CREATE OR REPLACE FUNCTION public.list_contract_pdf_exports(
  _contract_id uuid,
  _search text DEFAULT NULL,
  _source text DEFAULT NULL,
  _contract_version integer DEFAULT NULL,
  _template_version_number integer DEFAULT NULL,
  _limit integer DEFAULT 20,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  export_ref text,
  exported_at timestamptz,
  exporter_display_name text,
  is_self boolean,
  source text,
  contract_number text,
  contract_status text,
  contract_version integer,
  official_version_number integer,
  document_hash_prefix text,
  template_version_number integer,
  template_name_ar text,
  template_name_en text,
  amendment_count integer,
  line_item_count integer,
  boq_group_count integer,
  export_locale text,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_is_party boolean := false;
  v_lim integer := GREATEST(1, LEAST(COALESCE(_limit, 20), 100));
  v_off integer := GREATEST(0, COALESCE(_offset, 0));
  v_q text := NULLIF(btrim(COALESCE(_search, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'super_admin');

  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = _contract_id
        AND (c.client_id = v_uid OR c.provider_id = v_uid)
    ) INTO v_is_party;
    IF NOT v_is_party THEN
      RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      e.id,
      e.exported_at,
      e.exported_by,
      e.source,
      e.contract_number,
      e.contract_status,
      e.contract_version,
      e.official_version_number,
      e.document_hash_prefix,
      e.template_version_number,
      e.template_name_ar,
      e.template_name_en,
      e.amendment_count,
      e.line_item_count,
      e.boq_group_count,
      e.export_locale,
      COALESCE(NULLIF(btrim(p.full_name), ''), p.ref_id) AS exporter_display_name
    FROM public.contract_pdf_exports e
    LEFT JOIN public.profiles p ON p.user_id = e.exported_by
    WHERE e.contract_id = _contract_id
      AND e.archived_at IS NULL
      AND (_source IS NULL OR e.source = _source)
      AND (_contract_version IS NULL OR e.contract_version = _contract_version)
      AND (_template_version_number IS NULL OR e.template_version_number = _template_version_number)
      AND (
        v_q IS NULL OR (
          COALESCE(e.contract_number, '') ILIKE '%' || v_q || '%'
          OR COALESCE(e.document_hash_prefix, '') ILIKE '%' || v_q || '%'
          OR COALESCE(e.template_name_ar, '') ILIKE '%' || v_q || '%'
          OR COALESCE(e.template_name_en, '') ILIKE '%' || v_q || '%'
          OR COALESCE(e.source, '') ILIKE '%' || v_q || '%'
          OR COALESCE(NULLIF(btrim(p.full_name), ''), p.ref_id, '') ILIKE '%' || v_q || '%'
        )
      )
  ),
  counted AS (
    SELECT b.*, COUNT(*) OVER() AS total_count FROM base b
  )
  SELECT
    encode(digest(c.id::text || ':' || COALESCE(v_uid::text, ''), 'sha256'), 'hex') AS export_ref,
    c.exported_at,
    c.exporter_display_name,
    (c.exported_by = v_uid) AS is_self,
    c.source,
    c.contract_number,
    c.contract_status,
    c.contract_version,
    c.official_version_number,
    c.document_hash_prefix,
    c.template_version_number,
    c.template_name_ar,
    c.template_name_en,
    c.amendment_count,
    c.line_item_count,
    c.boq_group_count,
    c.export_locale,
    c.total_count
  FROM counted c
  ORDER BY c.exported_at DESC
  LIMIT v_lim OFFSET v_off;
END;
$$;
