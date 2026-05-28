-- ORG-RBAC-STRUCTURE-9B — Owner staff-row invariant trigger.
--
-- Option C model (see docs/org-rbac-structure.md):
--   * Owner MUST always have an active business_staff row.
--   * That row MUST keep role = 'owner' and is_active = true.
--   * Owner does NOT have to remain primary manager (delegation allowed).
--
-- This migration only adds a BEFORE UPDATE/DELETE trigger. It does NOT
-- enforce who is primary manager (already enforced by Phase 8 partial
-- unique index ux_business_staff_one_active_primary_manager).

-- 1) Defensive runtime precheck — abort if any owner is already missing
--    an active owner staff row.
DO $$
DECLARE
  bad_count INT;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM (
    SELECT b.id
    FROM public.businesses b
    WHERE b.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.business_staff bs
        WHERE bs.business_id = b.id
          AND bs.user_id = b.user_id
          AND bs.is_active = true
          AND bs.role = 'owner'
      )
  ) d;

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'ORG-RBAC-STRUCTURE-9B abort: % business(es) missing an active owner staff row. Backfill before enforcing.',
      bad_count;
  END IF;
END
$$;

-- 2) Trigger function. SECURITY DEFINER so the lookup against
--    businesses.user_id succeeds even when the caller's RLS would
--    otherwise hide the row; the function itself only enforces an
--    invariant and never returns data.
CREATE OR REPLACE FUNCTION public.enforce_business_owner_staff_invariant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  -- Resolve the registered owner of the affected business (OLD row).
  SELECT b.user_id INTO v_owner_id
  FROM public.businesses b
  WHERE b.id = OLD.business_id;

  -- If we cannot resolve the owner (orphan business), do nothing — that
  -- case is surfaced elsewhere (validateBusinessInvariants /
  -- admin_identity_integrity_report). Never block on missing parent.
  IF v_owner_id IS NULL THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  -- Only guard the OWNER's own staff row.
  IF OLD.user_id IS DISTINCT FROM v_owner_id THEN
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF OLD.role IS DISTINCT FROM 'owner' THEN
    -- OLD row is not the owner row (e.g. owner also holds another staff
    -- row under a different role — currently disallowed by unique
    -- (business_id, user_id), but be defensive).
    RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'ORG-RBAC-STRUCTURE-9B: cannot delete the owner staff row for business %', OLD.business_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- UPDATE path: block deactivation or role change away from 'owner'.
  IF NEW.is_active = false THEN
    RAISE EXCEPTION
      'ORG-RBAC-STRUCTURE-9B: cannot deactivate the owner staff row for business %', OLD.business_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.role IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION
      'ORG-RBAC-STRUCTURE-9B: cannot change role away from ''owner'' on the owner staff row for business %', OLD.business_id
      USING ERRCODE = 'check_violation';
  END IF;

  -- is_primary_manager updates are intentionally allowed (Option C).
  RETURN NEW;
END
$$;

COMMENT ON FUNCTION public.enforce_business_owner_staff_invariant() IS
  'ORG-RBAC-STRUCTURE-9B: protects the owner''s business_staff row from deletion, deactivation, or role demotion. Does not enforce primary-manager assignment (delegation allowed).';

-- Lock down EXECUTE: only triggers need to fire this function.
REVOKE ALL ON FUNCTION public.enforce_business_owner_staff_invariant() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_business_owner_staff_invariant() FROM anon, authenticated;

-- 3) Attach the trigger. BEFORE UPDATE OR DELETE per phase scope.
DROP TRIGGER IF EXISTS trg_enforce_business_owner_staff_invariant ON public.business_staff;
CREATE TRIGGER trg_enforce_business_owner_staff_invariant
  BEFORE UPDATE OR DELETE ON public.business_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_business_owner_staff_invariant();

COMMENT ON TRIGGER trg_enforce_business_owner_staff_invariant ON public.business_staff IS
  'ORG-RBAC-STRUCTURE-9B owner staff-row invariant. INSERT path intentionally not guarded in 9B.';
