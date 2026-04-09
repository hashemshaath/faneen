
-- 1. Trigger function for user_roles changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'role_assigned',
      'user_role',
      NEW.user_id,
      jsonb_build_object('role', NEW.role, 'target_user_id', NEW.user_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'role_updated',
      'user_role',
      NEW.user_id,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role, 'target_user_id', NEW.user_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'role_removed',
      'user_role',
      OLD.user_id,
      jsonb_build_object('role', OLD.role, 'target_user_id', OLD.user_id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 2. Trigger function for platform_settings changes
CREATE OR REPLACE FUNCTION public.log_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'setting_created',
      'platform_setting',
      NEW.id,
      jsonb_build_object('key', NEW.setting_key, 'category', NEW.category)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'setting_updated',
      'platform_setting',
      NEW.id,
      jsonb_build_object(
        'key', NEW.setting_key,
        'category', NEW.category,
        'old_value', CASE WHEN OLD.is_secret THEN '***' ELSE OLD.setting_value END,
        'new_value', CASE WHEN NEW.is_secret THEN '***' ELSE NEW.setting_value END,
        'old_active', OLD.is_active,
        'new_active', NEW.is_active
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (
      auth.uid(),
      'setting_deleted',
      'platform_setting',
      OLD.id,
      jsonb_build_object('key', OLD.setting_key, 'category', OLD.category)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3. Create triggers
CREATE TRIGGER trg_log_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_role_change();

CREATE TRIGGER trg_log_settings_change
AFTER INSERT OR UPDATE OR DELETE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.log_settings_change();
