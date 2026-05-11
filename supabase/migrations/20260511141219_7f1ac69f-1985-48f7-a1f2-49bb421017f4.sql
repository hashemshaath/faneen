
-- Phase M3C.1 — Branch limit enforcement pilot
-- Narrow scope: only business_branches.max_branches is enforced.
-- Admins, service-role, and system contexts bypass.

CREATE OR REPLACE FUNCTION public.enforce_branch_membership_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _owner uuid;
  _max_branches int;
  _active_count int;
  _plan_limits jsonb;
BEGIN
  -- 1) Only enforce on transitions that result in an active branch.
  IF NEW.is_active IS DISTINCT FROM TRUE THEN
    RETURN NEW;
  END IF;

  -- 2) On UPDATE: skip if it was already active (no transition).
  IF TG_OP = 'UPDATE' AND OLD.is_active = TRUE THEN
    RETURN NEW;
  END IF;

  -- 3) System / service-role / unauthenticated context: do not block.
  IF _caller IS NULL THEN
    RETURN NEW;
  END IF;

  -- 4) Admins bypass.
  IF public.has_admin_access(_caller) THEN
    RETURN NEW;
  END IF;

  -- 5) Resolve business owner. If business is missing or has no owner, do not block.
  SELECT user_id INTO _owner FROM public.businesses WHERE id = NEW.business_id;
  IF _owner IS NULL THEN
    RETURN NEW;
  END IF;

  -- 6) Resolve active plan limits inline (avoid auth checks of helper RPC).
  --    Prefer business-scoped active subscription; fall back to user-scoped.
  SELECT mp.limits INTO _plan_limits
  FROM public.membership_subscriptions ms
  JOIN public.membership_plans mp ON mp.id = ms.plan_id
  WHERE ms.status = 'active'
    AND (ms.expires_at IS NULL OR ms.expires_at > now())
    AND (ms.business_id = NEW.business_id OR (ms.business_id IS NULL AND ms.user_id = _owner))
  ORDER BY (ms.business_id = NEW.business_id) DESC, ms.created_at DESC
  LIMIT 1;

  _max_branches := NULLIF(_plan_limits->>'max_branches', '')::int;

  -- 7) Fallback to free-tier defaults if no active subscription / key missing.
  IF _max_branches IS NULL THEN
    SELECT NULLIF(mp.limits->>'max_branches', '')::int INTO _max_branches
    FROM public.membership_plans mp
    WHERE mp.tier = 'free' AND mp.is_active = true
    ORDER BY mp.sort_order
    LIMIT 1;
  END IF;

  -- 8) 0 / NULL means unlimited.
  IF _max_branches IS NULL OR _max_branches = 0 THEN
    RETURN NEW;
  END IF;

  -- 9) Count currently active branches for this business, excluding the row being updated.
  SELECT COUNT(*)::int INTO _active_count
  FROM public.business_branches
  WHERE business_id = NEW.business_id
    AND is_active = TRUE
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  -- 10) Block if adding/activating this branch would exceed the limit.
  IF (_active_count + 1) > _max_branches THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:branches'
      USING ERRCODE = 'P0001',
            DETAIL = json_build_object(
              'metric', 'branches',
              'used', _active_count,
              'limit', _max_branches,
              'business_id', NEW.business_id
            )::text;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_branch_membership_limit() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_enforce_branch_membership_limit_ins ON public.business_branches;
DROP TRIGGER IF EXISTS trg_enforce_branch_membership_limit_upd ON public.business_branches;

CREATE TRIGGER trg_enforce_branch_membership_limit_ins
BEFORE INSERT ON public.business_branches
FOR EACH ROW EXECUTE FUNCTION public.enforce_branch_membership_limit();

CREATE TRIGGER trg_enforce_branch_membership_limit_upd
BEFORE UPDATE OF is_active ON public.business_branches
FOR EACH ROW EXECUTE FUNCTION public.enforce_branch_membership_limit();
