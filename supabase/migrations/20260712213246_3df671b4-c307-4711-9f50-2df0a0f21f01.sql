
-- ─────────────────────────────────────────────────────────────
-- P3.1 — Admin fan-out on new provider submission
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_admins_business_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin RECORD;
  v_ref   TEXT;
BEGIN
  IF NEW.approval_status = 'submitted'
     AND (OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
    v_ref := COALESCE(NEW.ref_id, NEW.id::text);
    FOR v_admin IN
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
    LOOP
      INSERT INTO public.notifications
        (user_id, notification_type, title_ar, title_en,
         body_ar, body_en, reference_id, reference_type, action_url)
      VALUES (
        v_admin.user_id,
        'provider_submission_new',
        'منشأة جديدة بانتظار المراجعة',
        'New provider submission awaiting review',
        'المنشأة ' || COALESCE(NEW.name_ar, NEW.name_en, v_ref) || ' أرسلت طلب اعتماد.',
        'Business ' || COALESCE(NEW.name_en, NEW.name_ar, v_ref) || ' submitted for approval.',
        NEW.id, 'business',
        '/admin/provider-review/' || NEW.id::text
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_business_submitted ON public.businesses;
CREATE TRIGGER trg_notify_admins_business_submitted
AFTER UPDATE OF approval_status ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_business_submitted();

-- ─────────────────────────────────────────────────────────────
-- P3.2 — Notify owner when is_verified flips
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_owner_verification_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_biz_name TEXT;
BEGIN
  IF (OLD.is_verified IS DISTINCT FROM NEW.is_verified)
     AND NEW.user_id IS NOT NULL THEN
    v_biz_name := COALESCE(NEW.name_ar, NEW.name_en, COALESCE(NEW.ref_id, NEW.id::text));
    INSERT INTO public.notifications
      (user_id, notification_type, title_ar, title_en,
       body_ar, body_en, reference_id, reference_type, action_url)
    VALUES (
      NEW.user_id,
      'business_verification_changed',
      'تم تحديث مستوى توثيق منشأتك',
      'Your business verification was updated',
      'المنشأة ' || v_biz_name || ' أصبحت ' ||
        CASE WHEN NEW.is_verified THEN 'موثقة رسمياً.' ELSE 'غير موثقة.' END,
      'Business ' || v_biz_name || ' is now ' ||
        CASE WHEN NEW.is_verified THEN 'officially verified.' ELSE 'unverified.' END,
      NEW.id, 'business',
      '/dashboard/business-profile'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_owner_verification_changed ON public.businesses;
CREATE TRIGGER trg_notify_owner_verification_changed
AFTER UPDATE OF is_verified ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.notify_owner_verification_changed();

-- ─────────────────────────────────────────────────────────────
-- P3.4 — Lightweight in-app notif on profile phone/email change
-- Email change confirmation email is still handled by Supabase Auth's
-- built-in email_change flow via auth-email-hook; this trigger only
-- adds an in-app confirmation record so users see the change in the
-- notification center.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_account_contact_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed TEXT[] := ARRAY[]::TEXT[];
BEGIN
  IF OLD.phone IS DISTINCT FROM NEW.phone THEN
    v_changed := array_append(v_changed, 'phone');
  END IF;
  IF OLD.email IS DISTINCT FROM NEW.email THEN
    v_changed := array_append(v_changed, 'email');
  END IF;
  IF array_length(v_changed, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications
    (user_id, notification_type, title_ar, title_en,
     body_ar, body_en, reference_id, reference_type, action_url)
  VALUES (
    NEW.id,
    'account_contact_updated',
    'تم تحديث بيانات الاتصال',
    'Account contact updated',
    'تم تحديث: ' || array_to_string(v_changed, '، ') || '. إن لم يكن أنت، يرجى مراجعة الأمان.',
    'Updated: ' || array_to_string(v_changed, ', ') || '. If this was not you, please review account security.',
    NEW.id, 'profile',
    '/dashboard/profile'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_account_contact_updated ON public.profiles;
CREATE TRIGGER trg_notify_account_contact_updated
AFTER UPDATE OF phone, email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_account_contact_updated();
