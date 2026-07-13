
-- ── Shared helper: resolve active plan limits for (user, business) ──
CREATE OR REPLACE FUNCTION public._resolve_active_plan_limits(
  _user_id uuid,
  _business_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid := _user_id;
  _limits jsonb;
BEGIN
  IF _owner IS NULL AND _business_id IS NOT NULL THEN
    SELECT user_id INTO _owner FROM public.businesses WHERE id = _business_id;
  END IF;

  -- Prefer business-scoped active subscription, fall back to user-scoped.
  SELECT mp.limits INTO _limits
  FROM public.membership_subscriptions ms
  JOIN public.membership_plans mp ON mp.id = ms.plan_id
  WHERE ms.status = 'active'
    AND (ms.expires_at IS NULL OR ms.expires_at > now())
    AND (
      (_business_id IS NOT NULL AND ms.business_id = _business_id)
      OR (ms.business_id IS NULL AND ms.user_id = _owner)
    )
  ORDER BY (ms.business_id = _business_id) DESC NULLS LAST, ms.created_at DESC
  LIMIT 1;

  -- Fall back to free-tier defaults when there is no active subscription.
  IF _limits IS NULL THEN
    SELECT mp.limits INTO _limits
    FROM public.membership_plans mp
    WHERE mp.tier = 'free' AND mp.is_active = true
    ORDER BY mp.sort_order
    LIMIT 1;
  END IF;

  RETURN _limits;
END;
$$;

REVOKE ALL ON FUNCTION public._resolve_active_plan_limits(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._resolve_active_plan_limits(uuid, uuid) FROM anon;

-- ══════════════════════════════════════════════════════════════════
-- ENFORCEMENT TRIGGERS — one per table, mirroring branch pattern.
-- All raise 'quota_exceeded:<metric>' with SQLSTATE 42501.
-- ══════════════════════════════════════════════════════════════════

-- ── services ──
CREATE OR REPLACE FUNCTION public.enforce_services_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
  _limits jsonb;
  _max int;
  _count int;
BEGIN
  IF NEW.is_active IS DISTINCT FROM TRUE THEN RETURN NEW; END IF;
  IF _caller IS NULL THEN RETURN NEW; END IF;                   -- system / service-role
  IF public.has_admin_access(_caller) THEN RETURN NEW; END IF;  -- admin bypass

  _limits := public._resolve_active_plan_limits(NULL, NEW.business_id);
  _max := NULLIF(_limits->>'max_services','')::int;
  IF _max IS NULL OR _max = 0 THEN RETURN NEW; END IF;

  SELECT COUNT(*)::int INTO _count FROM public.business_services
   WHERE business_id = NEW.business_id AND is_active = TRUE;

  IF _count >= _max THEN
    RAISE EXCEPTION 'quota_exceeded:services' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_services_quota ON public.business_services;
CREATE TRIGGER trg_enforce_services_quota
  BEFORE INSERT ON public.business_services
  FOR EACH ROW EXECUTE FUNCTION public.enforce_services_quota();

-- ── contracts (monthly, excluding drafts/cancelled) ──
CREATE OR REPLACE FUNCTION public.enforce_contracts_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
  _limits jsonb;
  _max int;
  _count int;
  _month_start timestamptz := date_trunc('month', now());
BEGIN
  IF NEW.provider_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status IN ('draft','cancelled') THEN RETURN NEW; END IF;
  IF _caller IS NULL THEN RETURN NEW; END IF;
  IF public.has_admin_access(_caller) THEN RETURN NEW; END IF;

  _limits := public._resolve_active_plan_limits(NEW.provider_id, NEW.business_id);
  _max := NULLIF(_limits->>'max_contracts','')::int;
  IF _max IS NULL OR _max = 0 THEN RETURN NEW; END IF;

  SELECT COUNT(*)::int INTO _count FROM public.contracts
   WHERE provider_id = NEW.provider_id
     AND created_at >= _month_start
     AND status NOT IN ('draft','cancelled');

  IF _count >= _max THEN
    RAISE EXCEPTION 'quota_exceeded:contracts' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_contracts_quota ON public.contracts;
CREATE TRIGGER trg_enforce_contracts_quota
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_contracts_quota();

-- ── promotions ──
CREATE OR REPLACE FUNCTION public.enforce_promotions_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
  _limits jsonb;
  _max int;
  _count int;
BEGIN
  IF NEW.is_active IS DISTINCT FROM TRUE THEN RETURN NEW; END IF;
  IF _caller IS NULL THEN RETURN NEW; END IF;
  IF public.has_admin_access(_caller) THEN RETURN NEW; END IF;

  _limits := public._resolve_active_plan_limits(NULL, NEW.business_id);
  _max := NULLIF(_limits->>'max_promotions','')::int;
  IF _max IS NULL OR _max = 0 THEN RETURN NEW; END IF;

  SELECT COUNT(*)::int INTO _count FROM public.promotions
   WHERE business_id = NEW.business_id AND is_active = TRUE;

  IF _count >= _max THEN
    RAISE EXCEPTION 'quota_exceeded:promotions' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_promotions_quota ON public.promotions;
CREATE TRIGGER trg_enforce_promotions_quota
  BEFORE INSERT ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_promotions_quota();

-- ── portfolio: portfolio_items + projects share the max_projects limit ──
CREATE OR REPLACE FUNCTION public.enforce_portfolio_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
  _limits jsonb;
  _max int;
  _count int;
BEGIN
  IF NEW.business_id IS NULL THEN RETURN NEW; END IF;
  IF _caller IS NULL THEN RETURN NEW; END IF;
  IF public.has_admin_access(_caller) THEN RETURN NEW; END IF;

  _limits := public._resolve_active_plan_limits(NULL, NEW.business_id);
  _max := NULLIF(_limits->>'max_projects','')::int;
  IF _max IS NULL OR _max = 0 THEN RETURN NEW; END IF;

  SELECT
    (SELECT COUNT(*) FROM public.portfolio_items WHERE business_id = NEW.business_id)
    + (SELECT COUNT(*) FROM public.projects WHERE business_id = NEW.business_id)
    INTO _count;

  IF _count >= _max THEN
    RAISE EXCEPTION 'quota_exceeded:portfolio' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_portfolio_items_quota ON public.portfolio_items;
CREATE TRIGGER trg_enforce_portfolio_items_quota
  BEFORE INSERT ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_portfolio_quota();

DROP TRIGGER IF EXISTS trg_enforce_projects_quota ON public.projects;
CREATE TRIGGER trg_enforce_projects_quota
  BEFORE INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_portfolio_quota();

-- ── staff (excluding owner role) ──
CREATE OR REPLACE FUNCTION public.enforce_staff_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _caller uuid := auth.uid();
  _limits jsonb;
  _max int;
  _count int;
BEGIN
  IF NEW.is_active IS DISTINCT FROM TRUE THEN RETURN NEW; END IF;
  IF NEW.role::text = 'owner' THEN RETURN NEW; END IF;
  IF _caller IS NULL THEN RETURN NEW; END IF;
  IF public.has_admin_access(_caller) THEN RETURN NEW; END IF;

  _limits := public._resolve_active_plan_limits(NULL, NEW.business_id);
  _max := NULLIF(_limits->>'max_staff','')::int;
  IF _max IS NULL OR _max = 0 THEN RETURN NEW; END IF;

  SELECT COUNT(*)::int INTO _count FROM public.business_staff
   WHERE business_id = NEW.business_id
     AND is_active = TRUE
     AND role::text <> 'owner';

  IF _count >= _max THEN
    RAISE EXCEPTION 'quota_exceeded:staff' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_staff_quota ON public.business_staff;
CREATE TRIGGER trg_enforce_staff_quota
  BEFORE INSERT ON public.business_staff
  FOR EACH ROW EXECUTE FUNCTION public.enforce_staff_quota();
