-- ============================================================
-- PHASE 2 — OWNER PRIMARY MANAGER NORMALIZATION (idempotent)
-- ============================================================

WITH targets AS (
  SELECT bs.id
  FROM public.business_staff bs
  JOIN public.businesses b ON b.id = bs.business_id
  WHERE bs.role = 'owner'
    AND bs.is_active = true
    AND bs.is_primary_manager = false
    AND bs.user_id = b.user_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.business_staff bs2
      WHERE bs2.business_id = bs.business_id
        AND bs2.is_active = true
        AND bs2.is_primary_manager = true
    )
)
UPDATE public.business_staff bs
SET is_primary_manager = true,
    updated_at = now()
FROM targets t
WHERE bs.id = t.id;

-- ============================================================
-- PHASE 3 — ADMIN IDENTITY INTEGRITY REPORT (read-only RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_identity_integrity_report()
RETURNS TABLE (
  user_id uuid,
  masked_email text,
  mismatch_type text,
  has_profile boolean,
  has_role boolean,
  has_business boolean,
  synthetic_or_test boolean,
  recommended_action text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization: admins only.
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      u.id                                    AS user_id,
      lower(coalesce(u.email, ''))            AS auth_email,
      lower(coalesce(p.email, ''))            AS profile_email,
      (p.id IS NOT NULL)                      AS has_profile,
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id)        AS has_role,
      EXISTS (SELECT 1 FROM public.businesses b  WHERE b.user_id = u.id)         AS has_business,
      (
        coalesce(u.email, '') ILIKE '%@phone.qitaat.local'
        OR coalesce(u.email, '') ILIKE '%@example.com'
        OR coalesce(u.email, '') ILIKE 'test_%'
        OR coalesce(p.email, '') ILIKE '%@phone.qitaat.local'
        OR coalesce(p.email, '') ILIKE '%@example.com'
      )                                       AS synthetic_or_test
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
  )
  SELECT
    b.user_id,
    -- mask: keep first 2 chars of local + first char of domain, preserve TLD.
    CASE
      WHEN b.auth_email = '' THEN '—'
      ELSE (
        substr(split_part(b.auth_email, '@', 1), 1, 2)
        || repeat('•', greatest(2, length(split_part(b.auth_email, '@', 1)) - 2))
        || '@'
        || substr(split_part(b.auth_email, '@', 2), 1, 1)
        || repeat('•', 3)
        || CASE
             WHEN strpos(split_part(b.auth_email, '@', 2), '.') > 0
             THEN '.' || split_part(b.auth_email, '.', -1)
             ELSE ''
           END
      )
    END                                                                            AS masked_email,
    CASE
      WHEN b.auth_email = '' AND b.profile_email = '' THEN 'no_email'
      WHEN b.profile_email = '' THEN 'profile_missing_email'
      WHEN b.auth_email <> b.profile_email THEN 'email_mismatch'
      ELSE 'ok'
    END                                                                            AS mismatch_type,
    b.has_profile,
    b.has_role,
    b.has_business,
    b.synthetic_or_test,
    CASE
      WHEN NOT b.has_profile                                  THEN 'create_profile'
      WHEN NOT b.has_role                                     THEN 'assign_default_role'
      WHEN b.synthetic_or_test                                THEN 'manual_review_synthetic'
      WHEN b.profile_email = '' AND b.auth_email <> ''        THEN 'backfill_profile_email_after_approval'
      WHEN b.auth_email <> b.profile_email AND b.auth_email <> '' AND b.profile_email <> ''
                                                              THEN 'manual_reconcile_emails'
      ELSE 'none'
    END                                                                            AS recommended_action
  FROM base b
  ORDER BY b.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_identity_integrity_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_identity_integrity_report() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_identity_integrity_report() TO service_role;

COMMENT ON FUNCTION public.admin_identity_integrity_report() IS
  'CRITICAL-ENTITY-IDENTITY-ACCESS-FIX-1 Phase 3: admin-only read-only identity health report. Returns masked emails and mismatch flags. Authorization enforced inside the function via has_role.';
