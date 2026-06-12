-- ============================================================
-- BUSINESSES SENSITIVE FIELDS HARDENING
-- Findings: businesses_table_internal_fields_public (supabase_lov)
-- Restrict CR/ID/approval_notes/owner_name to owner+admin only.
-- Keep vat_number / account_manager_* accessible to managers.
-- ============================================================

-- 1) Column-level GRANTs: revoke SELECT on sensitive cols from broad roles.
REVOKE SELECT (
  cr_scan_raw,
  cr_scan_data,
  cr_document_url,
  national_id,
  approval_notes,
  cr_owner_name
) ON public.businesses FROM PUBLIC, anon, authenticated;

-- Also revoke UPDATE so only the dedicated RPC (security definer) can write.
REVOKE UPDATE (
  cr_scan_raw,
  cr_scan_data,
  cr_document_url,
  national_id,
  approval_notes,
  cr_owner_name
) ON public.businesses FROM PUBLIC, anon, authenticated;

-- Service role keeps everything (already implicit via GRANT ALL elsewhere; ensure here):
GRANT SELECT (
  cr_scan_raw,
  cr_scan_data,
  cr_document_url,
  national_id,
  approval_notes,
  cr_owner_name
) ON public.businesses TO service_role;
GRANT UPDATE (
  cr_scan_raw,
  cr_scan_data,
  cr_document_url,
  national_id,
  approval_notes,
  cr_owner_name
) ON public.businesses TO service_role;

-- 2) Split the broad read policy: owner+admin keep full row read;
--    managers get a separate read policy covering non-sensitive cols only
--    (column GRANT enforces field-level separation).
DROP POLICY IF EXISTS "Owners managers and admins read full business rows" ON public.businesses;

-- Owners read their own businesses (full row at RLS level; column GRANTs cover sensitive cols too).
CREATE POLICY "Owners read own business rows"
  ON public.businesses FOR SELECT
  USING (auth.uid() = user_id);

-- Managers (business_staff role='manager' or 'owner') read business rows
-- but column-level REVOKE blocks the 6 sensitive columns.
CREATE POLICY "Managers read assigned business rows"
  ON public.businesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.user_id = auth.uid()
        AND bs.business_id = businesses.id
        AND bs.role IN ('owner', 'manager')
        AND bs.is_active = true
    )
  );
-- ("Admins can view all businesses" already exists — covers admin path.)

-- 3) Secure read RPC for sensitive fields — owner or admin only.
CREATE OR REPLACE FUNCTION public.get_business_sensitive_fields(p_business_id uuid)
RETURNS TABLE (
  cr_scan_raw       text,
  cr_scan_data      jsonb,
  cr_document_url   text,
  national_id       text,
  approval_notes    text,
  cr_owner_name     text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.user_id = v_uid)
    OR public.has_admin_access(v_uid)
  ) THEN
    RAISE EXCEPTION 'forbidden_sensitive_business_fields' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT b.cr_scan_raw, b.cr_scan_data, b.cr_document_url,
           b.national_id, b.approval_notes, b.cr_owner_name
      FROM public.businesses b
     WHERE b.id = p_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_sensitive_fields(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_sensitive_fields(uuid) TO authenticated;

-- 4) Secure write RPC. NULL parameter => leave column unchanged.
--    Pass empty string '' to explicitly clear a text column;
--    pass jsonb 'null'::jsonb to clear cr_scan_data.
CREATE OR REPLACE FUNCTION public.update_business_sensitive_fields(
  p_business_id      uuid,
  p_cr_scan_raw      text   DEFAULT NULL,
  p_cr_scan_data     jsonb  DEFAULT NULL,
  p_cr_document_url  text   DEFAULT NULL,
  p_national_id      text   DEFAULT NULL,
  p_approval_notes   text   DEFAULT NULL,
  p_cr_owner_name    text   DEFAULT NULL,
  p_clear_scan_data  boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.user_id = v_uid)
    OR public.has_admin_access(v_uid)
  ) THEN
    RAISE EXCEPTION 'forbidden_sensitive_business_fields' USING ERRCODE = '42501';
  END IF;

  UPDATE public.businesses
     SET cr_scan_raw     = COALESCE(p_cr_scan_raw,     cr_scan_raw),
         cr_scan_data    = CASE WHEN p_clear_scan_data THEN NULL
                                ELSE COALESCE(p_cr_scan_data, cr_scan_data) END,
         cr_document_url = COALESCE(p_cr_document_url, cr_document_url),
         national_id     = COALESCE(p_national_id,     national_id),
         approval_notes  = COALESCE(p_approval_notes,  approval_notes),
         cr_owner_name   = COALESCE(p_cr_owner_name,   cr_owner_name),
         updated_at      = now()
   WHERE id = p_business_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_business_sensitive_fields(uuid, text, jsonb, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_business_sensitive_fields(uuid, text, jsonb, text, text, text, text, boolean) TO authenticated;