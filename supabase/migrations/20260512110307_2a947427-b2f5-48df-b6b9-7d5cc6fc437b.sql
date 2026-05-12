CREATE OR REPLACE FUNCTION public.search_contract_clients(_q text)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email_masked text,
  phone_masked text,
  ref_id text,
  account_type text,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_admin boolean := public.has_role(v_caller, 'admin') OR public.has_role(v_caller, 'super_admin');
  v_q text := nullif(btrim(coalesce(_q, '')), '');
BEGIN
  IF v_caller IS NULL THEN
    RETURN;
  END IF;
  IF v_q IS NULL OR length(v_q) < 2 THEN
    RETURN;
  END IF;

  IF v_is_admin THEN
    RETURN QUERY
      SELECT
        p.user_id,
        p.full_name,
        CASE WHEN p.email IS NULL THEN NULL
             ELSE regexp_replace(p.email, '(^.).*(@.*$)', '\1•••\2') END,
        CASE WHEN p.phone IS NULL THEN NULL
             ELSE regexp_replace(p.phone, '(.{0,3}).*(.{3}$)', '\1•••\2') END,
        p.ref_id,
        p.account_type::text,
        'admin'::text
      FROM public.profiles p
      WHERE p.is_banned IS NOT TRUE
        AND (
          p.full_name ILIKE '%' || v_q || '%'
          OR p.email ILIKE '%' || v_q || '%'
          OR p.phone ILIKE '%' || v_q || '%'
          OR p.ref_id ILIKE '%' || v_q || '%'
        )
      ORDER BY p.full_name NULLS LAST
      LIMIT 25;
  ELSE
    RETURN QUERY
      WITH allowed AS (
        SELECT c.client_id AS uid, 'contract'::text AS src
          FROM public.contracts c WHERE c.provider_id = v_caller
        UNION
        SELECT lr.user_id AS uid, 'lead'::text AS src
          FROM public.lead_requests lr
          JOIN public.businesses b ON b.id = lr.business_id
         WHERE b.owner_id = v_caller AND lr.user_id IS NOT NULL
      )
      SELECT
        p.user_id,
        p.full_name,
        CASE WHEN p.email IS NULL THEN NULL
             ELSE regexp_replace(p.email, '(^.).*(@.*$)', '\1•••\2') END,
        CASE WHEN p.phone IS NULL THEN NULL
             ELSE regexp_replace(p.phone, '(.{0,3}).*(.{3}$)', '\1•••\2') END,
        p.ref_id,
        p.account_type::text,
        min(a.src)
      FROM allowed a
      JOIN public.profiles p ON p.user_id = a.uid
      WHERE p.is_banned IS NOT TRUE
        AND (
          p.full_name ILIKE '%' || v_q || '%'
          OR p.email ILIKE '%' || v_q || '%'
          OR p.phone ILIKE '%' || v_q || '%'
          OR p.ref_id ILIKE '%' || v_q || '%'
        )
      GROUP BY p.user_id, p.full_name, p.email, p.phone, p.ref_id, p.account_type
      ORDER BY p.full_name NULLS LAST
      LIMIT 25;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.search_contract_clients(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.search_contract_clients(text) TO authenticated;

COMMENT ON FUNCTION public.search_contract_clients(text) IS
  'CT4B safe client lookup for contract creation. Admins see all customers; providers see only clients linked to their businesses or contracts. Email/phone are masked.';