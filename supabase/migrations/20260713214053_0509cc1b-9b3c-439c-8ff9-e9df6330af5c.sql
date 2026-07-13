
-- ── M1.1 Seed deferred quota keys into membership_plans.limits ──
-- 0 means unlimited (existing convention).
UPDATE public.membership_plans SET limits = COALESCE(limits, '{}'::jsonb) || jsonb_build_object(
  'max_contracts', 3,
  'max_staff', 1,
  'max_blog_posts', 2,
  'max_rfqs_monthly', 5,
  'search_priority', 0
) WHERE tier = 'free';

UPDATE public.membership_plans SET limits = COALESCE(limits, '{}'::jsonb) || jsonb_build_object(
  'max_contracts', 20,
  'max_staff', 5,
  'max_blog_posts', 10,
  'max_rfqs_monthly', 25,
  'search_priority', 1
) WHERE tier = 'basic';

UPDATE public.membership_plans SET limits = COALESCE(limits, '{}'::jsonb) || jsonb_build_object(
  'max_contracts', 100,
  'max_staff', 25,
  'max_blog_posts', 0,
  'max_rfqs_monthly', 100,
  'search_priority', 2
) WHERE tier = 'premium';

UPDATE public.membership_plans SET limits = COALESCE(limits, '{}'::jsonb) || jsonb_build_object(
  'max_contracts', 0,
  'max_staff', 0,
  'max_blog_posts', 0,
  'max_rfqs_monthly', 0,
  'search_priority', 3
) WHERE tier = 'enterprise';

-- ── M1.2 check_membership_quota RPC ──
CREATE OR REPLACE FUNCTION public.check_membership_quota(
  _metric text,
  _business_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _row record;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Admin bypass: platform admins are never quota-blocked.
  IF public.has_admin_access(_caller) THEN
    RETURN;
  END IF;

  -- Delegate accounting to the canonical usage function.
  -- get_membership_usage handles caller authorization for the business.
  SELECT metric, used, limit_value
    INTO _row
  FROM public.get_membership_usage(_business_id, COALESCE(_user_id, _caller))
  WHERE metric = _metric
  LIMIT 1;

  -- Unknown metric → no-op (M2 will add new metrics as needed).
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- 0 means unlimited; only enforce when limit_value > 0.
  IF _row.limit_value > 0 AND _row.used >= _row.limit_value THEN
    RAISE EXCEPTION 'quota_exceeded:%', _metric USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.check_membership_quota(text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_membership_quota(text, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_membership_quota(text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_membership_quota(text, uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.check_membership_quota(text, uuid, uuid) IS
  'M1: Reads get_membership_usage and raises quota_exceeded:<metric> (SQLSTATE 42501) when a business has hit its plan limit. Admin bypass. Enforcement wiring lands in M2.';
