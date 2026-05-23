CREATE OR REPLACE FUNCTION public.guard_business_staff_last_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining int;
  parent_exists boolean;
BEGIN
  -- Only relevant when the affected row is/was an active owner.
  IF OLD.role <> 'owner' OR OLD.is_active = false THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Skip when running inside a cascade (e.g. businesses DELETE → staff CASCADE).
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Skip when parent business has already been removed.
  SELECT EXISTS (
    SELECT 1 FROM public.businesses WHERE id = OLD.business_id
  ) INTO parent_exists;
  IF NOT parent_exists THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- UPDATE that keeps the row as active owner for the same business is allowed.
  IF TG_OP = 'UPDATE'
     AND NEW.role = 'owner'
     AND NEW.is_active = true
     AND NEW.business_id = OLD.business_id THEN
    RETURN NEW;
  END IF;

  -- Count remaining active owners excluding this row.
  SELECT count(*) INTO remaining
    FROM public.business_staff
    WHERE business_id = OLD.business_id
      AND role = 'owner'
      AND is_active = true
      AND id <> OLD.id;

  IF remaining = 0 THEN
    RAISE EXCEPTION 'Cannot remove, deactivate, or demote the sole active owner of business % — assign a new owner first', OLD.business_id
      USING ERRCODE = '23514';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_business_staff_last_owner_guard ON public.business_staff;
CREATE TRIGGER trg_business_staff_last_owner_guard
  BEFORE DELETE OR UPDATE OF role, is_active, business_id
  ON public.business_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_business_staff_last_owner();

COMMENT ON FUNCTION public.guard_business_staff_last_owner() IS
  'R4E-2C-2: blocks deleting, deactivating, demoting, or moving the last active owner of a business. No admin bypass; transfer ownership by inserting a new owner first. Cascaded business deletes are allowed.';