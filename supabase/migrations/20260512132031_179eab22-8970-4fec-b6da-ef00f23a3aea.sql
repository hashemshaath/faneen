-- ──────────────────────────────────────────────────────────────────────────────
-- PDF-QA2: Contract PDF export history
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.contract_pdf_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  exported_by uuid NOT NULL REFERENCES auth.users(id),
  exported_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'unknown'
    CHECK (source IN ('contract_detail','dashboard_contracts','admin','unknown')),
  contract_number text,
  contract_status text,
  contract_version integer,
  official_version_number integer,
  document_hash text,
  document_hash_prefix text,
  template_version_id uuid REFERENCES public.contract_template_versions(id),
  template_version_number integer,
  template_name_ar text,
  template_name_en text,
  has_amendments boolean NOT NULL DEFAULT false,
  amendment_count integer NOT NULL DEFAULT 0,
  line_item_count integer NOT NULL DEFAULT 0,
  boq_group_count integer NOT NULL DEFAULT 0,
  export_locale text,
  user_agent_hash text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cpe_contract           ON public.contract_pdf_exports(contract_id);
CREATE INDEX IF NOT EXISTS idx_cpe_exported_by        ON public.contract_pdf_exports(exported_by);
CREATE INDEX IF NOT EXISTS idx_cpe_exported_at        ON public.contract_pdf_exports(exported_at DESC);
CREATE INDEX IF NOT EXISTS idx_cpe_template_version   ON public.contract_pdf_exports(template_version_id);
CREATE INDEX IF NOT EXISTS idx_cpe_doc_hash_prefix    ON public.contract_pdf_exports(document_hash_prefix);

ALTER TABLE public.contract_pdf_exports ENABLE ROW LEVEL SECURITY;

-- Admin / super_admin: full read
CREATE POLICY cpe_admin_read ON public.contract_pdf_exports
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Provider / client: read own contract history
CREATE POLICY cpe_party_read ON public.contract_pdf_exports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_pdf_exports.contract_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

-- No direct inserts/updates/deletes — all writes go through the SECURITY DEFINER RPC.
REVOKE INSERT, UPDATE, DELETE ON public.contract_pdf_exports FROM anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- record_contract_pdf_export RPC
-- ──────────────────────────────────────────────────────────────────────────────
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

  -- Template version metadata (server-side only)
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

  -- Counts
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

  INSERT INTO public.contract_pdf_exports (
    contract_id, exported_by, source,
    contract_number, contract_status,
    contract_version, official_version_number,
    document_hash, document_hash_prefix,
    template_version_id, template_version_number,
    template_name_ar, template_name_en,
    has_amendments, amendment_count,
    line_item_count, boq_group_count,
    export_locale
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
    NULLIF(_export_locale, '')
  )
  RETURNING id, contract_pdf_exports.exported_at
  INTO v_export_id, v_exported_at;

  RETURN QUERY SELECT v_export_id, v_exported_at, v_contract.contract_number, v_doc_prefix;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_contract_pdf_export(uuid, text, text) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.record_contract_pdf_export(uuid, text, text) TO authenticated;