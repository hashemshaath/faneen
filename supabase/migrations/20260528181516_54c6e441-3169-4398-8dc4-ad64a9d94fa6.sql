-- ORG-RBAC-STRUCTURE-8 — Primary manager uniqueness hardening.
--
-- Precondition: zero duplicates verified at authoring time
--   SELECT business_id, COUNT(*) FROM public.business_staff
--   WHERE is_active = true AND is_primary_manager = true
--   GROUP BY business_id HAVING COUNT(*) > 1;
--   -> 0 rows
--
-- This migration:
--   1. Re-runs the duplicate precheck and RAISEs if any are found
--      (defensive — protects against drift between authoring and apply).
--   2. Creates a partial unique index enforcing AT MOST ONE active
--      primary manager per business. Does NOT enforce who that is
--      (owner-only enforcement is a separate decision).
--   3. Is fully reversible by dropping the index.
DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM (
    SELECT business_id
    FROM public.business_staff
    WHERE is_active = true AND is_primary_manager = true
    GROUP BY business_id
    HAVING COUNT(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE EXCEPTION
      'ORG-RBAC-STRUCTURE-8 abort: % business_id(s) already have multiple active primary managers. Resolve duplicates before enforcing uniqueness.',
      dup_count;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_business_staff_one_active_primary_manager
  ON public.business_staff (business_id)
  WHERE is_active = true AND is_primary_manager = true;

COMMENT ON INDEX public.ux_business_staff_one_active_primary_manager IS
  'ORG-RBAC-STRUCTURE-8: at most one active primary manager per business. UI invariant validateBusinessInvariants enforces the same.';
