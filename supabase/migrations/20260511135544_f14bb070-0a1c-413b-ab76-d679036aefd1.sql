
-- ============================================================
-- Phase M3A: Read-only membership usage calculations
-- No enforcement, no triggers, no RLS changes to source tables
-- ============================================================

-- Free-tier defaults (mirror src/lib/membership-limits.ts LIMIT_FIELDS defaults)
CREATE OR REPLACE FUNCTION public._membership_free_defaults()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'max_featured_ads', 0,
    'homepage_visibility', false,
    'search_priority', 0,
    'suggested_services', false,
    'profile_badge', false,
    'max_projects', 5,
    'max_services', 5,
    'max_promotions', 0,
    'max_blog_posts', 0,
    'max_contracts', 3,
    'max_branches', 1,
    'max_staff', 1,
    'max_bookings_daily', 10,
    'bnpl_enabled', false,
    'analytics_enabled', false,
    'priority_support', false,
    'dedicated_manager', false,
    'performance_reports', false
  );
$$;

-- ------------------------------------------------------------
-- get_active_membership_limits
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_membership_limits(
  _user_id uuid,
  _business_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean := public.has_admin_access(_caller);
  _plan_limits jsonb;
  _defaults jsonb := public._membership_free_defaults();
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Authorization: caller must be admin, the user themselves, or
  -- an owner/manager of the business (when business scope is given).
  IF NOT _is_admin THEN
    IF _business_id IS NOT NULL THEN
      IF NOT public.is_business_owner_or_manager(_caller, _business_id) THEN
        RAISE EXCEPTION 'Not authorized for this business' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF _caller <> _user_id THEN
        RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- Prefer business-scoped active sub, then user-scoped active sub, else free.
  SELECT mp.limits
    INTO _plan_limits
  FROM public.membership_subscriptions ms
  JOIN public.membership_plans mp ON mp.id = ms.plan_id
  WHERE ms.status = 'active'
    AND (ms.expires_at IS NULL OR ms.expires_at > now())
    AND (
      (_business_id IS NOT NULL AND ms.business_id = _business_id)
      OR (_business_id IS NULL AND ms.user_id = _user_id AND ms.business_id IS NULL)
    )
  ORDER BY ms.created_at DESC
  LIMIT 1;

  -- Fallback: any active user-scoped sub if business-scoped not found
  IF _plan_limits IS NULL AND _business_id IS NOT NULL THEN
    SELECT mp.limits
      INTO _plan_limits
    FROM public.membership_subscriptions ms
    JOIN public.membership_plans mp ON mp.id = ms.plan_id
    WHERE ms.status = 'active'
      AND (ms.expires_at IS NULL OR ms.expires_at > now())
      AND ms.user_id = _user_id
    ORDER BY ms.created_at DESC
    LIMIT 1;
  END IF;

  -- Merge defaults <- plan limits (plan keys override defaults)
  RETURN _defaults || COALESCE(_plan_limits, '{}'::jsonb);
END;
$$;

-- ------------------------------------------------------------
-- get_membership_usage
-- Returns one row per metric with used/limit/period/flags.
-- Sentinel limit = 0 means "unlimited"; we encode as limit_value=0
-- and over_limit/near_cap = false in that case.
-- Period semantics:
--   'monthly'    -> calendar-month rolling window on created_at
--   'active_set' -> currently active rows
--   'lifetime'   -> all rows for the owner
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_membership_usage(
  _business_id uuid DEFAULT NULL,
  _user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  metric text,
  used integer,
  limit_value integer,
  period text,
  near_cap boolean,
  over_limit boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean := public.has_admin_access(_caller);
  _target_user uuid := _user_id;
  _limits jsonb;
  _month_start timestamptz := date_trunc('month', now());
  _used int;
  _lim int;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  -- Resolve user from business if not explicitly given (for user-owned metrics)
  IF _target_user IS NULL AND _business_id IS NOT NULL THEN
    SELECT b.user_id INTO _target_user FROM public.businesses b WHERE b.id = _business_id;
  END IF;
  IF _target_user IS NULL THEN
    _target_user := _caller;
  END IF;

  -- Authorization
  IF NOT _is_admin THEN
    IF _business_id IS NOT NULL THEN
      IF NOT public.is_business_owner_or_manager(_caller, _business_id) THEN
        RAISE EXCEPTION 'Not authorized for this business' USING ERRCODE = '42501';
      END IF;
    ELSIF _target_user <> _caller THEN
      RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
    END IF;
  END IF;

  _limits := public.get_active_membership_limits(_target_user, _business_id);

  -- Helper inline: emit one row
  -- (we just compute per-metric and return query at the end via UNION)

  RETURN QUERY
  WITH rows AS (
    -- contracts: monthly, non-draft, non-cancelled, owned by provider user
    SELECT
      'contracts'::text AS metric,
      (SELECT COUNT(*)::int FROM public.contracts c
        WHERE c.provider_id = _target_user
          AND c.created_at >= _month_start
          AND c.status NOT IN ('draft','cancelled'))::int AS used,
      COALESCE((_limits->>'max_contracts')::int, 0) AS lim,
      'monthly'::text AS period
    WHERE _business_id IS NULL OR _business_id IS NOT NULL  -- always include
    UNION ALL
    -- services: active set per business
    SELECT 'services',
      CASE WHEN _business_id IS NULL THEN 0
        ELSE (SELECT COUNT(*)::int FROM public.business_services bs
              WHERE bs.business_id = _business_id AND bs.is_active = true)
      END,
      COALESCE((_limits->>'max_services')::int, 0),
      'active_set'
    UNION ALL
    -- portfolio: lifetime per business (portfolio_items + projects)
    SELECT 'portfolio',
      CASE WHEN _business_id IS NULL THEN 0
        ELSE (SELECT COUNT(*)::int FROM public.portfolio_items pi WHERE pi.business_id = _business_id)
           + (SELECT COUNT(*)::int FROM public.projects pr WHERE pr.business_id = _business_id)
      END,
      COALESCE((_limits->>'max_projects')::int, 0),
      'lifetime'
    UNION ALL
    -- branches: active set per business
    SELECT 'branches',
      CASE WHEN _business_id IS NULL THEN 0
        ELSE (SELECT COUNT(*)::int FROM public.business_branches bb
              WHERE bb.business_id = _business_id AND bb.is_active = true)
      END,
      COALESCE((_limits->>'max_branches')::int, 0),
      'active_set'
    UNION ALL
    -- staff: active, excluding owner role
    SELECT 'staff',
      CASE WHEN _business_id IS NULL THEN 0
        ELSE (SELECT COUNT(*)::int FROM public.business_staff bst
              WHERE bst.business_id = _business_id
                AND bst.is_active = true
                AND bst.role <> 'owner')
      END,
      COALESCE((_limits->>'max_staff')::int, 0),
      'active_set'
    UNION ALL
    -- promotions: active set per business
    SELECT 'promotions',
      CASE WHEN _business_id IS NULL THEN 0
        ELSE (SELECT COUNT(*)::int FROM public.promotions pm
              WHERE pm.business_id = _business_id AND pm.is_active = true)
      END,
      COALESCE((_limits->>'max_promotions')::int, 0),
      'active_set'
    UNION ALL
    -- blog_posts: monthly published by author user
    SELECT 'blog_posts',
      (SELECT COUNT(*)::int FROM public.blog_posts bp
        WHERE bp.author_id = _target_user
          AND bp.status = 'published'
          AND COALESCE(bp.published_at, bp.created_at) >= _month_start),
      COALESCE((_limits->>'max_blog_posts')::int, 0),
      'monthly'
  )
  SELECT
    r.metric,
    r.used,
    r.lim AS limit_value,
    r.period,
    -- near_cap: ≥80% but not over (only meaningful when finite)
    (r.lim > 0 AND r.used >= CEIL(r.lim::numeric * 0.8) AND r.used < r.lim) AS near_cap,
    -- over_limit: only when finite
    (r.lim > 0 AND r.used > r.lim) AS over_limit
  FROM rows r;
END;
$$;

-- ------------------------------------------------------------
-- Admin-only: usage across all providers (for the over-limit report)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_membership_usage(
  _only_over_or_near boolean DEFAULT true,
  _limit integer DEFAULT 200
)
RETURNS TABLE(
  business_id uuid,
  business_name_ar text,
  business_name_en text,
  owner_user_id uuid,
  tier text,
  metric text,
  used integer,
  limit_value integer,
  period text,
  near_cap boolean,
  over_limit boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _lim int := GREATEST(1, LEAST(COALESCE(_limit, 200), 1000));
BEGIN
  IF NOT public.has_admin_access(_caller) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH biz AS (
    SELECT b.id, b.name_ar, b.name_en, b.user_id, b.membership_tier::text AS tier
    FROM public.businesses b
    LIMIT _lim
  ),
  expanded AS (
    SELECT
      bz.id AS business_id,
      bz.name_ar AS business_name_ar,
      bz.name_en AS business_name_en,
      bz.user_id AS owner_user_id,
      bz.tier,
      u.metric, u.used, u.limit_value, u.period, u.near_cap, u.over_limit
    FROM biz bz,
    LATERAL public.get_membership_usage(bz.id, bz.user_id) u
  )
  SELECT *
  FROM expanded e
  WHERE NOT _only_over_or_near OR e.near_cap OR e.over_limit
  ORDER BY e.over_limit DESC, e.near_cap DESC, e.business_name_ar;
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_active_membership_limits(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_membership_usage(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_membership_usage(boolean, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public._membership_free_defaults() TO authenticated;
