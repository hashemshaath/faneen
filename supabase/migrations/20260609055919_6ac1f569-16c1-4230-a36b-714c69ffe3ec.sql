-- ============================================================================
-- Security hardening migration (scanner findings)
-- ============================================================================

-- 1) REALTIME: stop broadcasting PII-bearing tables ----------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.bookings';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rfq_requests'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.rfq_requests';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rfq_quotes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.rfq_quotes';
  END IF;
END $$;

-- 2) PRIVATE_SECTORS public view — drop contact_email / contact_phone ----------
DROP VIEW IF EXISTS public.private_sectors_public CASCADE;

CREATE VIEW public.private_sectors_public
WITH (security_invoker = true)
AS
  SELECT
    p.id,
    p.ref_id,
    p.business_id,
    p.parent_sector,
    p.brand_type,
    p.name_ar,
    p.name_en,
    p.slug,
    p.short_description_ar,
    p.short_description_en,
    p.description_ar,
    p.description_en,
    p.logo_url,
    p.cover_url,
    p.website,
    p.country_id,
    p.city_id,
    p.category_id,
    -- contact_email / contact_phone intentionally omitted (PII)
    p.established_year,
    p.is_featured,
    p.sort_order,
    p.seo_title_ar,
    p.seo_title_en,
    p.seo_description_ar,
    p.seo_description_en,
    p.seo_keywords,
    p.created_at,
    p.updated_at,
    c.name_ar AS city_name_ar,
    c.name_en AS city_name_en,
    NULL::text AS category_name_ar,
    NULL::text AS category_name_en,
    NULL::text AS category_slug,
    b.name_ar AS business_name_ar,
    b.name_en AS business_name_en,
    b.username AS business_username
  FROM public.private_sectors p
  LEFT JOIN public.cities c     ON c.id = p.city_id
  LEFT JOIN public.businesses b ON b.id = p.business_id
  WHERE p.status = 'approved'::public.private_sector_status;

GRANT SELECT ON public.private_sectors_public TO anon, authenticated;
GRANT ALL    ON public.private_sectors_public TO service_role;

-- 3) LEAD_REQUESTS — internal_notes is staff-only -----------------------------
REVOKE SELECT (internal_notes) ON public.lead_requests FROM authenticated;
REVOKE SELECT (internal_notes) ON public.lead_requests FROM anon;
GRANT  SELECT (internal_notes) ON public.lead_requests TO service_role;

CREATE OR REPLACE FUNCTION public.get_lead_internal_notes(_lead_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_notes       text;
BEGIN
  SELECT business_id, internal_notes
    INTO v_business_id, v_notes
    FROM public.lead_requests
   WHERE id = _lead_id;

  IF v_business_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.is_business_owner_or_manager(auth.uid(), v_business_id) THEN
    RETURN v_notes;
  END IF;

  -- Caller is not authorized to see staff-only notes.
  RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
END;
$$;

REVOKE ALL    ON FUNCTION public.get_lead_internal_notes(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lead_internal_notes(uuid) TO authenticated;

-- 4) CLIENT_SITES — owner_id_number / tax_number are owner-only ---------------
REVOKE SELECT (owner_id_number, tax_number) ON public.client_sites FROM authenticated;
REVOKE SELECT (owner_id_number, tax_number) ON public.client_sites FROM anon;
GRANT  SELECT (owner_id_number, tax_number) ON public.client_sites TO service_role;

CREATE OR REPLACE FUNCTION public.get_client_site_sensitive(_site_id uuid)
RETURNS TABLE (
  owner_id_number text,
  tax_number      text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_user_id uuid;
BEGIN
  SELECT cs.client_user_id INTO v_client_user_id
    FROM public.client_sites cs
   WHERE cs.id = _site_id;

  IF v_client_user_id IS NULL THEN
    RETURN;
  END IF;

  IF auth.uid() = v_client_user_id
     OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY
      SELECT cs.owner_id_number, cs.tax_number
        FROM public.client_sites cs
       WHERE cs.id = _site_id;
    RETURN;
  END IF;

  RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
END;
$$;

REVOKE ALL    ON FUNCTION public.get_client_site_sensitive(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_site_sensitive(uuid) TO authenticated;