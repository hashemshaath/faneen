
CREATE OR REPLACE FUNCTION public.get_business_public_profile(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business jsonb;
  v_business_id uuid;
  v_branches jsonb;
  v_services jsonb;
  v_certs jsonb;
  v_awards jsonb;
  v_offers_count int;
  v_today date := (now() at time zone 'utc')::date;
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) = 0 THEN
    RETURN NULL;
  END IF;

  -- Business headline row (public, masked view — no PII).
  SELECT to_jsonb(b.*) INTO v_business
  FROM public.businesses_public b
  WHERE lower(b.username) = lower(trim(p_slug))
  LIMIT 1;

  IF v_business IS NULL THEN
    RETURN NULL;
  END IF;

  v_business_id := (v_business->>'id')::uuid;

  -- Branches (public view, active only, ordered like the app expects).
  SELECT COALESCE(jsonb_agg(row_to_json(b) ORDER BY b.is_main DESC NULLS LAST, b.sort_order ASC NULLS LAST), '[]'::jsonb)
    INTO v_branches
  FROM public.business_branches_public b
  WHERE b.business_id = v_business_id;

  -- Services — same filter as the "Public can view active allowed services" RLS policy.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', s.id,
           'name_ar', s.name_ar,
           'name_en', s.name_en,
           'description_ar', s.description_ar,
           'description_en', s.description_en,
           'price_from', s.price_from,
           'price_to', s.price_to,
           'currency_code', s.currency_code
         ) ORDER BY s.sort_order ASC NULLS LAST), '[]'::jsonb)
    INTO v_services
  FROM public.business_services s
  WHERE s.business_id = v_business_id
    AND s.is_active = true
    AND s.provider_status = 'active'
    AND s.admin_status = 'allowed';

  -- Certifications (active only).
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'name_ar', c.name_ar,
           'name_en', c.name_en,
           'issuer_ar', c.issuer_ar,
           'issuer_en', c.issuer_en,
           'credential_number', c.credential_number,
           'credential_url', c.credential_url,
           'logo_url', c.logo_url,
           'proof_document_url', c.proof_document_url,
           'issued_at', c.issued_at,
           'expires_at', c.expires_at,
           'is_active', c.is_active,
           'verified_by_admin', c.verified_by_admin,
           'display_order', c.display_order
         ) ORDER BY c.display_order ASC NULLS LAST, c.issued_at DESC NULLS LAST), '[]'::jsonb)
    INTO v_certs
  FROM public.business_certifications c
  WHERE c.business_id = v_business_id
    AND c.is_active = true;

  -- Awards (active only).
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', a.id,
           'title_ar', a.title_ar,
           'title_en', a.title_en,
           'issuer_ar', a.issuer_ar,
           'issuer_en', a.issuer_en,
           'description_ar', a.description_ar,
           'description_en', a.description_en,
           'awarded_year', a.awarded_year,
           'rank', a.rank,
           'category_ar', a.category_ar,
           'category_en', a.category_en,
           'image_url', a.image_url,
           'proof_url', a.proof_url,
           'is_active', a.is_active,
           'verified_by_admin', a.verified_by_admin,
           'display_order', a.display_order
         ) ORDER BY a.awarded_year DESC NULLS LAST, a.display_order ASC NULLS LAST), '[]'::jsonb)
    INTO v_awards
  FROM public.business_awards a
  WHERE a.business_id = v_business_id
    AND a.is_active = true;

  -- Active promotions count (badge).
  SELECT COUNT(*)::int INTO v_offers_count
  FROM public.promotions p
  WHERE p.business_id = v_business_id
    AND p.is_active = true
    AND (p.end_date IS NULL OR p.end_date >= v_today);

  RETURN jsonb_build_object(
    'business', v_business,
    'branches', v_branches,
    'services', v_services,
    'certifications', v_certs,
    'awards', v_awards,
    'active_promotions_count', v_offers_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_business_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_business_public_profile(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_business_public_profile(text) IS
  'Aggregated one-round-trip read for the public /{username} profile page. Returns {business, branches, services, certifications, awards, active_promotions_count}. Only public (non-PII) columns are exposed — mirrors businesses_public + business_branches_public + the public RLS filters on services/certifications/awards/promotions.';
