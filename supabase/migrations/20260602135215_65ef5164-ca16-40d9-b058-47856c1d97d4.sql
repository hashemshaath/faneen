-- 1) Guard function: skip end-user lifecycle notifications when target user is admin/super_admin.
CREATE OR REPLACE FUNCTION public.fn_suppress_admin_user_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_staff boolean;
  _is_user_facing boolean;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  _is_staff := public.has_role(NEW.user_id, 'admin'::app_role)
            OR public.has_role(NEW.user_id, 'super_admin'::app_role);

  IF NOT _is_staff THEN
    RETURN NEW;
  END IF;

  -- Suppress these end-user lifecycle notifications for staff accounts.
  _is_user_facing :=
        NEW.reference_type IN (
          'subscription',
          'membership_subscription_activated',
          'membership_tier_admin_override',
          'membership_upgrade_approved',
          'membership_upgrade_rejected',
          'onboarding_welcome'
        )
     OR (
          NEW.reference_type IS NULL
          AND COALESCE(NEW.title_ar, '') LIKE 'مرحباً بك في قِطاعات%'
        );

  IF _is_user_facing THEN
    RETURN NULL; -- skip insert silently
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suppress_admin_user_notifications ON public.notifications;
CREATE TRIGGER trg_suppress_admin_user_notifications
BEFORE INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.fn_suppress_admin_user_notifications();

-- 2) Clean up existing wrongly-delivered lifecycle notifications for current admin/super_admin users.
DELETE FROM public.notifications n
USING public.user_roles ur
WHERE ur.user_id = n.user_id
  AND ur.role IN ('admin'::app_role, 'super_admin'::app_role)
  AND (
        n.reference_type IN (
          'subscription',
          'membership_subscription_activated',
          'membership_tier_admin_override',
          'membership_upgrade_approved',
          'membership_upgrade_rejected',
          'onboarding_welcome'
        )
     OR (n.reference_type IS NULL AND COALESCE(n.title_ar, '') LIKE 'مرحباً بك في قِطاعات%')
  );