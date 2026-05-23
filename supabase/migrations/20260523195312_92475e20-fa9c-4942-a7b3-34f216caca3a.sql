CREATE OR REPLACE FUNCTION public.audit_business_sensitive_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_changes jsonb := '{}'::jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    v_changes := v_changes || jsonb_build_object('user_id', jsonb_build_object('old', OLD.user_id, 'new', NEW.user_id));
  END IF;
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    v_changes := v_changes || jsonb_build_object('approval_status', jsonb_build_object('old', OLD.approval_status, 'new', NEW.approval_status));
  END IF;
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    v_changes := v_changes || jsonb_build_object('is_active', jsonb_build_object('old', OLD.is_active, 'new', NEW.is_active));
  END IF;
  IF NEW.is_demo IS DISTINCT FROM OLD.is_demo THEN
    v_changes := v_changes || jsonb_build_object('is_demo', jsonb_build_object('old', OLD.is_demo, 'new', NEW.is_demo));
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    v_changes := v_changes || jsonb_build_object('is_verified', jsonb_build_object('old', OLD.is_verified, 'new', NEW.is_verified));
  END IF;
  IF NEW.membership_tier IS DISTINCT FROM OLD.membership_tier THEN
    v_changes := v_changes || jsonb_build_object('membership_tier', jsonb_build_object('old', OLD.membership_tier, 'new', NEW.membership_tier));
  END IF;

  IF v_changes = '{}'::jsonb THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
  VALUES (v_actor, 'business_sensitive_update', 'business', NEW.id,
          jsonb_build_object('changed_fields', v_changes));

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_sensitive_audit ON public.businesses;
CREATE TRIGGER trg_businesses_sensitive_audit
AFTER UPDATE OF user_id, approval_status, is_active, is_demo, is_verified, membership_tier
ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.audit_business_sensitive_update();

COMMENT ON FUNCTION public.audit_business_sensitive_update() IS
  'R4E-2C-3: writes admin_activity_log rows for sensitive businesses updates. Skips NULL auth.uid() contexts because admin_activity_log.user_id is NOT NULL.';