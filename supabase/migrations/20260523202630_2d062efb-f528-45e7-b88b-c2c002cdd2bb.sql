-- R4E-2C-4-PHASE-4: enforce membership-owned tier writes
CREATE OR REPLACE FUNCTION public.guard_business_membership_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.membership_tier IS DISTINCT FROM OLD.membership_tier THEN
    IF COALESCE(current_setting('app.membership_rpc', true), '') <> '1' THEN
      RAISE EXCEPTION
        'businesses.membership_tier may only be changed through membership RPCs (use admin_set_business_membership_tier)'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.guard_business_membership_tier()
IS 'R4E-2C-4-PHASE-4: enforces membership-owned tier writes via app.membership_rpc marker.';

DROP TRIGGER IF EXISTS trg_businesses_membership_tier_guard ON public.businesses;
CREATE TRIGGER trg_businesses_membership_tier_guard
BEFORE UPDATE OF membership_tier
ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.guard_business_membership_tier();