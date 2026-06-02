
-- MEMBERSHIP-TIER-SOURCE-OF-TRUTH-1 (retry with RAISE NOTICE log)

CREATE OR REPLACE FUNCTION public.membership_tier_rank(_tier public.membership_tier)
RETURNS smallint
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE _tier
    WHEN 'free' THEN 0::smallint
    WHEN 'basic' THEN 1::smallint
    WHEN 'premium' THEN 2::smallint
    WHEN 'enterprise' THEN 3::smallint
    ELSE 0::smallint
  END
$$;

CREATE OR REPLACE FUNCTION public.get_effective_membership_tier(p_business_id uuid)
RETURNS public.membership_tier
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT mp.tier
      FROM public.membership_subscriptions ms
      JOIN public.membership_plans mp ON mp.id = ms.plan_id
      WHERE ms.business_id = p_business_id
        AND ms.status = 'active'
        AND ms.cancelled_at IS NULL
        AND (ms.expires_at IS NULL OR ms.expires_at > now())
      ORDER BY public.membership_tier_rank(mp.tier) DESC,
               ms.created_at DESC
      LIMIT 1
    ),
    'free'::public.membership_tier
  )
$$;
REVOKE ALL ON FUNCTION public.get_effective_membership_tier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_effective_membership_tier(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_effective_user_membership_tier(p_user_id uuid)
RETURNS public.membership_tier
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT mp.tier
      FROM public.membership_subscriptions ms
      JOIN public.membership_plans mp ON mp.id = ms.plan_id
      WHERE ms.user_id = p_user_id
        AND ms.status = 'active'
        AND ms.cancelled_at IS NULL
        AND (ms.expires_at IS NULL OR ms.expires_at > now())
      ORDER BY public.membership_tier_rank(mp.tier) DESC,
               ms.created_at DESC
      LIMIT 1
    ),
    'free'::public.membership_tier
  )
$$;
REVOKE ALL ON FUNCTION public.get_effective_user_membership_tier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_effective_user_membership_tier(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sync_business_membership_tier(p_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _new_tier public.membership_tier;
  _cur_tier public.membership_tier;
  _profile_tier public.membership_tier;
  _cur_profile public.membership_tier;
BEGIN
  IF p_business_id IS NULL THEN RETURN; END IF;

  SELECT user_id, membership_tier INTO _owner, _cur_tier
  FROM public.businesses WHERE id = p_business_id;
  IF NOT FOUND THEN RETURN; END IF;

  _new_tier := public.get_effective_membership_tier(p_business_id);

  IF _new_tier IS DISTINCT FROM _cur_tier THEN
    PERFORM set_config('app.membership_rpc', '1', true);
    UPDATE public.businesses
       SET membership_tier = _new_tier
     WHERE id = p_business_id;
  END IF;

  IF _owner IS NOT NULL THEN
    SELECT COALESCE(
      (
        SELECT t FROM (
          SELECT public.get_effective_user_membership_tier(_owner) AS t
          UNION ALL
          SELECT public.get_effective_membership_tier(b.id) AS t
          FROM public.businesses b WHERE b.user_id = _owner
        ) s
        ORDER BY public.membership_tier_rank(t) DESC
        LIMIT 1
      ),
      'free'::public.membership_tier
    ) INTO _profile_tier;

    SELECT membership_tier INTO _cur_profile
    FROM public.profiles WHERE user_id = _owner;

    IF _profile_tier IS DISTINCT FROM _cur_profile THEN
      UPDATE public.profiles
         SET membership_tier = _profile_tier
       WHERE user_id = _owner;
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_business_membership_tier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_business_membership_tier(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_user_profile_membership_tier(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new public.membership_tier;
  _cur public.membership_tier;
BEGIN
  IF p_user_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(
    (
      SELECT t FROM (
        SELECT public.get_effective_user_membership_tier(p_user_id) AS t
        UNION ALL
        SELECT public.get_effective_membership_tier(b.id) AS t
        FROM public.businesses b WHERE b.user_id = p_user_id
      ) s
      ORDER BY public.membership_tier_rank(t) DESC
      LIMIT 1
    ),
    'free'::public.membership_tier
  ) INTO _new;

  SELECT membership_tier INTO _cur
  FROM public.profiles WHERE user_id = p_user_id;

  IF _new IS DISTINCT FROM _cur THEN
    UPDATE public.profiles SET membership_tier = _new WHERE user_id = p_user_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_user_profile_membership_tier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_user_profile_membership_tier(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.trg_sync_membership_tier_on_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.business_id IS NOT NULL THEN
      PERFORM public.sync_business_membership_tier(NEW.business_id);
    ELSIF NEW.user_id IS NOT NULL THEN
      PERFORM public.sync_user_profile_membership_tier(NEW.user_id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.business_id IS NOT NULL
       AND OLD.business_id IS DISTINCT FROM NEW.business_id THEN
      PERFORM public.sync_business_membership_tier(OLD.business_id);
    END IF;
    IF NEW.business_id IS NOT NULL THEN
      PERFORM public.sync_business_membership_tier(NEW.business_id);
    END IF;
    IF OLD.user_id IS DISTINCT FROM NEW.user_id AND OLD.user_id IS NOT NULL THEN
      PERFORM public.sync_user_profile_membership_tier(OLD.user_id);
    END IF;
    IF NEW.business_id IS NULL AND NEW.user_id IS NOT NULL THEN
      PERFORM public.sync_user_profile_membership_tier(NEW.user_id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.business_id IS NOT NULL THEN
      PERFORM public.sync_business_membership_tier(OLD.business_id);
    ELSIF OLD.user_id IS NOT NULL THEN
      PERFORM public.sync_user_profile_membership_tier(OLD.user_id);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_membership_subscriptions_sync_tier
  ON public.membership_subscriptions;

CREATE TRIGGER trg_membership_subscriptions_sync_tier
AFTER INSERT OR DELETE OR UPDATE OF
  status, plan_id, business_id, user_id, cancelled_at, expires_at
ON public.membership_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_membership_tier_on_subscription();

-- One-time reconciliation.
DO $$
DECLARE
  _b record;
  _changed_biz int := 0;
  _prev_biz public.membership_tier;
  _new_biz public.membership_tier;
BEGIN
  FOR _b IN SELECT id, membership_tier FROM public.businesses LOOP
    _prev_biz := _b.membership_tier;
    PERFORM public.sync_business_membership_tier(_b.id);
    SELECT membership_tier INTO _new_biz FROM public.businesses WHERE id = _b.id;
    IF _new_biz IS DISTINCT FROM _prev_biz THEN
      _changed_biz := _changed_biz + 1;
    END IF;
  END LOOP;

  PERFORM public.sync_user_profile_membership_tier(t.user_id)
  FROM (
    SELECT DISTINCT user_id FROM public.membership_subscriptions
    WHERE business_id IS NULL AND status = 'active'
  ) t;

  RAISE NOTICE 'MEMBERSHIP-TIER-SOURCE-OF-TRUTH-1: reconciled, businesses_resynced=%', _changed_biz;
END $$;

COMMENT ON FUNCTION public.get_effective_membership_tier(uuid) IS
  'Canonical read of effective business membership tier from membership_subscriptions ⨝ membership_plans. Highest-ranked active, non-expired, non-cancelled sub wins. Falls back to free.';
COMMENT ON FUNCTION public.sync_business_membership_tier(uuid) IS
  'Idempotent mirror writer: recomputes businesses.membership_tier and the owner profiles.membership_tier from the authoritative source. Bypasses guard_business_membership_tier via app.membership_rpc GUC.';
COMMENT ON TRIGGER trg_membership_subscriptions_sync_tier ON public.membership_subscriptions IS
  'MEMBERSHIP-TIER-SOURCE-OF-TRUTH-1: keeps businesses/profiles mirror columns consistent with membership_subscriptions on every lifecycle change.';
