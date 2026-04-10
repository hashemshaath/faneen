
-- Table to log unauthorized access attempts
CREATE TABLE public.access_violation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  ip_address text,
  route text,
  violation_type text NOT NULL DEFAULT 'unauthorized_access',
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_violation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view violation logs"
  ON public.access_violation_log FOR SELECT
  TO authenticated
  USING (has_admin_access(auth.uid()));

CREATE POLICY "Authenticated users can insert violations"
  ON public.access_violation_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anon can insert violations"
  ON public.access_violation_log FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE INDEX idx_violation_log_user_created ON public.access_violation_log (user_id, created_at DESC);

-- Function: check threshold and notify admins
CREATE OR REPLACE FUNCTION public.check_and_notify_violations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count integer;
  _admin record;
  _threshold integer := 5;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO _count
  FROM public.access_violation_log
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '1 hour';

  IF _count >= _threshold THEN
    FOR _admin IN
      SELECT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('admin', 'super_admin')
    LOOP
      PERFORM create_notification(
        _admin.user_id,
        'تنبيه أمني: محاولات وصول مشبوهة',
        'Security Alert: Suspicious access attempts',
        'المستخدم ' || NEW.user_id || ' تجاوز ' || _threshold || ' محاولات وصول غير مصرح بها خلال ساعة',
        'User ' || NEW.user_id || ' exceeded ' || _threshold || ' unauthorized access attempts in 1 hour',
        'security',
        NEW.user_id,
        'access_violation',
        '/admin/activity-log'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_violations
  AFTER INSERT ON public.access_violation_log
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_notify_violations();
