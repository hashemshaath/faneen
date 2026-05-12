
-- PDF-QA2B: Safe list RPC for contract PDF export history
-- Returns paginated, search/filterable rows with safe exporter display name
-- (no raw UUIDs, no email, no IP/UA hashes).

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

REVOKE ALL ON FUNCTION public.list_contract_pdf_exports(uuid, text, text, integer, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_contract_pdf_exports(uuid, text, text, integer, integer, integer, integer) TO authenticated;
