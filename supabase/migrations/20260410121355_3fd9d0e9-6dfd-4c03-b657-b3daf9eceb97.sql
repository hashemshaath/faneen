
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _actor uuid;
BEGIN
  _actor := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (_actor, 'role_assigned', 'user_role', NEW.user_id,
      jsonb_build_object('role', NEW.role, 'target_user_id', NEW.user_id));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (_actor, 'role_updated', 'user_role', NEW.user_id,
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role, 'target_user_id', NEW.user_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_activity_log (user_id, action, entity_type, entity_id, details)
    VALUES (_actor, 'role_removed', 'user_role', OLD.user_id,
      jsonb_build_object('role', OLD.role, 'target_user_id', OLD.user_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
