
CREATE OR REPLACE FUNCTION public.admin_list_contract_pdf_exports(
  _search text DEFAULT NULL,
  _source text DEFAULT NULL,
  _contract_status text DEFAULT NULL,
  _template_version_number integer DEFAULT NULL,
  _date_from timestamptz DEFAULT NULL,
  _date_to timestamptz DEFAULT NULL,
  _limit integer DEFAULT 50,
  _offset integer DEFAULT 0
)
RETURNS TABLE (
  export_ref text,
  exported_at timestamptz,
  exporter_display_name text,
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
  v_lim integer := GREATEST(1, LEAST(COALESCE(_limit, 50), 200));
  v_off integer := GREATEST(0, COALESCE(_offset, 0));
  v_q text := NULLIF(btrim(COALESCE(_search, '')), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;

  IF NOT (public.has_role(v_uid, 'admin'::app_role)
          OR public.has_role(v_uid, 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
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
    WHERE e.archived_at IS NULL
      AND (_source IS NULL OR e.source = _source)
      AND (_contract_status IS NULL OR e.contract_status = _contract_status)
      AND (_template_version_number IS NULL OR e.template_version_number = _template_version_number)
      AND (_date_from IS NULL OR e.exported_at >= _date_from)
      AND (_date_to   IS NULL OR e.exported_at <  _date_to)
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
    encode(digest(c.id::text || ':admin', 'sha256'), 'hex') AS export_ref,
    c.exported_at,
    c.exporter_display_name,
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

REVOKE ALL ON FUNCTION public.admin_list_contract_pdf_exports(text, text, text, integer, timestamptz, timestamptz, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_contract_pdf_exports(text, text, text, integer, timestamptz, timestamptz, integer, integer) TO authenticated;

-- Lightweight admin summary stats (also admin-only).
CREATE OR REPLACE FUNCTION public.admin_contract_pdf_exports_summary()
RETURNS TABLE (
  exports_today bigint,
  exports_7d bigint,
  unique_contracts_30d bigint,
  top_source text,
  archived_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth required' USING ERRCODE = '28000';
  END IF;
  IF NOT (public.has_role(v_uid, 'admin'::app_role)
          OR public.has_role(v_uid, 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.contract_pdf_exports
       WHERE archived_at IS NULL
         AND exported_at >= date_trunc('day', now())) AS exports_today,
    (SELECT count(*) FROM public.contract_pdf_exports
       WHERE archived_at IS NULL
         AND exported_at >= now() - interval '7 days') AS exports_7d,
    (SELECT count(DISTINCT contract_id) FROM public.contract_pdf_exports
       WHERE archived_at IS NULL
         AND exported_at >= now() - interval '30 days') AS unique_contracts_30d,
    (SELECT source FROM public.contract_pdf_exports
       WHERE archived_at IS NULL
         AND exported_at >= now() - interval '30 days'
       GROUP BY source ORDER BY count(*) DESC LIMIT 1) AS top_source,
    (SELECT count(*) FROM public.contract_pdf_exports
       WHERE archived_at IS NOT NULL) AS archived_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_contract_pdf_exports_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_contract_pdf_exports_summary() TO authenticated;
