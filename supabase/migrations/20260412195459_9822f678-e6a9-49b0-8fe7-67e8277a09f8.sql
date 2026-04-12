
-- Trigger: notify on subscription status changes (subscribe, cancel, renew, upgrade)
CREATE OR REPLACE FUNCTION public.notify_subscription_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _plan membership_plans%ROWTYPE;
  _plan_name_ar text;
  _plan_name_en text;
BEGIN
  SELECT * INTO _plan FROM membership_plans WHERE id = NEW.plan_id;
  _plan_name_ar := COALESCE(_plan.name_ar, '');
  _plan_name_en := COALESCE(_plan.name_en, _plan.name_ar);

  IF TG_OP = 'INSERT' THEN
    -- New subscription
    PERFORM create_notification(
      NEW.user_id,
      'تم تفعيل اشتراك: ' || _plan_name_ar,
      'Subscription activated: ' || _plan_name_en,
      'تم تفعيل اشتراكك في باقة ' || _plan_name_ar || ' بنجاح. الاشتراك ينتهي بتاريخ ' || COALESCE(to_char(NEW.expires_at, 'YYYY-MM-DD'), '∞'),
      'Your ' || _plan_name_en || ' subscription is now active. Expires: ' || COALESCE(to_char(NEW.expires_at, 'YYYY-MM-DD'), '∞'),
      'membership', NEW.id, 'subscription', '/membership'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Cancelled
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' THEN
      PERFORM create_notification(
        NEW.user_id,
        'تم إلغاء اشتراكك في ' || _plan_name_ar,
        'Subscription cancelled: ' || _plan_name_en,
        'تم إلغاء اشتراكك بنجاح. يمكنك إعادة الاشتراك في أي وقت',
        'Your subscription has been cancelled. You can resubscribe anytime.',
        'membership', NEW.id, 'subscription', '/membership'
      );
    -- Replaced (upgraded/downgraded)
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'replaced' THEN
      PERFORM create_notification(
        NEW.user_id,
        'تم تحديث اشتراكك',
        'Subscription updated',
        'تم استبدال اشتراكك السابق بخطة جديدة',
        'Your previous subscription has been replaced with a new plan.',
        'membership', NEW.id, 'subscription', '/membership'
      );
    -- Expired
    ELSIF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'expired' THEN
      PERFORM create_notification(
        NEW.user_id,
        'انتهت صلاحية اشتراكك في ' || _plan_name_ar,
        'Subscription expired: ' || _plan_name_en,
        'انتهت صلاحية اشتراكك. جدد الآن للاستمرار بالمزايا الحصرية',
        'Your subscription has expired. Renew now to keep your exclusive benefits.',
        'membership', NEW.id, 'subscription', '/membership'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger
DROP TRIGGER IF EXISTS trg_notify_subscription_change ON public.membership_subscriptions;
CREATE TRIGGER trg_notify_subscription_change
  AFTER INSERT OR UPDATE ON public.membership_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_subscription_change();
