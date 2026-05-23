CREATE OR REPLACE FUNCTION public.guard_business_sensitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Service role / migrations / DB-internal operations: allow.
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins: allow sensitive business flips.
  IF public.has_admin_access(uid) THEN
    RETURN NEW;
  END IF;

  -- Non-admin caller: reject if any guarded field changes.
  IF NEW.user_id         IS DISTINCT FROM OLD.user_id
  OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
  OR NEW.is_active       IS DISTINCT FROM OLD.is_active
  OR NEW.is_demo         IS DISTINCT FROM OLD.is_demo
  OR NEW.is_verified     IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'Only admins may modify sensitive business fields (user_id, approval_status, is_active, is_demo, is_verified)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_sensitive_guard ON public.businesses;
CREATE TRIGGER trg_businesses_sensitive_guard
  BEFORE UPDATE OF user_id, approval_status, is_active, is_demo, is_verified
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_business_sensitive_fields();

COMMENT ON FUNCTION public.guard_business_sensitive_fields() IS
  'R4E-2C-1: rejects non-admin UPDATEs that change sensitive business fields. membership_tier intentionally excluded; tracked as TODO_GAP_G3.';