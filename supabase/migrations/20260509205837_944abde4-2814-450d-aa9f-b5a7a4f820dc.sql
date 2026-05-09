-- 1) Notification preferences per user
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  -- channels (master switches)
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  sms_enabled BOOLEAN NOT NULL DEFAULT false,
  -- email categories
  email_marketing BOOLEAN NOT NULL DEFAULT true,
  email_messages BOOLEAN NOT NULL DEFAULT true,
  email_maintenance_updates BOOLEAN NOT NULL DEFAULT true,
  email_contracts BOOLEAN NOT NULL DEFAULT true,
  email_bookings BOOLEAN NOT NULL DEFAULT true,
  email_leads BOOLEAN NOT NULL DEFAULT true,
  email_system BOOLEAN NOT NULL DEFAULT true,
  -- in-app categories
  inapp_messages BOOLEAN NOT NULL DEFAULT true,
  inapp_maintenance_updates BOOLEAN NOT NULL DEFAULT true,
  inapp_contracts BOOLEAN NOT NULL DEFAULT true,
  inapp_bookings BOOLEAN NOT NULL DEFAULT true,
  inapp_leads BOOLEAN NOT NULL DEFAULT true,
  inapp_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own prefs" ON public.notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own prefs" ON public.notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own prefs" ON public.notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admins read all prefs" ON public.notification_preferences
  FOR SELECT USING (public.has_admin_access(auth.uid()));

CREATE TRIGGER trg_notification_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Business notification preferences (sent to business email)
CREATE TABLE IF NOT EXISTS public.business_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  email_leads BOOLEAN NOT NULL DEFAULT true,
  email_bookings BOOLEAN NOT NULL DEFAULT true,
  email_contracts BOOLEAN NOT NULL DEFAULT true,
  email_maintenance_updates BOOLEAN NOT NULL DEFAULT true,
  email_messages BOOLEAN NOT NULL DEFAULT true,
  email_marketing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.business_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner read biz prefs" ON public.business_notification_preferences
  FOR SELECT USING (public.is_business_owner_or_manager(auth.uid(), business_id));
CREATE POLICY "owner insert biz prefs" ON public.business_notification_preferences
  FOR INSERT WITH CHECK (public.is_business_owner_or_manager(auth.uid(), business_id));
CREATE POLICY "owner update biz prefs" ON public.business_notification_preferences
  FOR UPDATE USING (public.is_business_owner_or_manager(auth.uid(), business_id));
CREATE POLICY "admins read all biz prefs" ON public.business_notification_preferences
  FOR SELECT USING (public.has_admin_access(auth.uid()));

CREATE TRIGGER trg_biz_notification_prefs_updated_at
  BEFORE UPDATE ON public.business_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Open/Click tracking columns on email_send_log
ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS opens_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS first_clicked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_opened_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_clicked_at TIMESTAMPTZ;

-- 4) Public RPCs to record open/click. SECURITY DEFINER so anonymous tracking works.
CREATE OR REPLACE FUNCTION public.record_email_open(_message_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _message_id IS NULL OR _message_id = '' THEN RETURN; END IF;
  UPDATE public.email_send_log
  SET opens_count = opens_count + 1,
      first_opened_at = COALESCE(first_opened_at, now()),
      last_opened_at = now()
  WHERE message_id = _message_id AND status = 'sent';
END;
$$;

CREATE OR REPLACE FUNCTION public.record_email_click(_message_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _message_id IS NULL OR _message_id = '' THEN RETURN; END IF;
  UPDATE public.email_send_log
  SET clicks_count = clicks_count + 1,
      first_clicked_at = COALESCE(first_clicked_at, now()),
      last_clicked_at = now(),
      first_opened_at = COALESCE(first_opened_at, now()),
      last_opened_at = COALESCE(last_opened_at, now())
  WHERE message_id = _message_id AND status = 'sent';
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_email_open(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_email_click(TEXT) TO anon, authenticated;

-- 5) Engagement stats RPC (admin-only)
CREATE OR REPLACE FUNCTION public.get_email_engagement_stats(_window_minutes INTEGER DEFAULT 1440)
RETURNS TABLE(
  delivered BIGINT,
  unique_opens BIGINT,
  unique_clicks BIGINT,
  total_opens BIGINT,
  total_clicks BIGINT,
  open_rate NUMERIC,
  click_rate NUMERIC
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH latest AS (
    SELECT DISTINCT ON (message_id)
      message_id, status, opens_count, clicks_count, created_at
    FROM public.email_send_log
    WHERE message_id IS NOT NULL
      AND created_at >= now() - (_window_minutes || ' minutes')::interval
    ORDER BY message_id, created_at DESC
  ),
  base AS (
    SELECT * FROM latest WHERE status = 'sent'
  ),
  agg AS (
    SELECT
      count(*)::bigint AS delivered,
      count(*) FILTER (WHERE opens_count > 0)::bigint AS unique_opens,
      count(*) FILTER (WHERE clicks_count > 0)::bigint AS unique_clicks,
      COALESCE(sum(opens_count), 0)::bigint AS total_opens,
      COALESCE(sum(clicks_count), 0)::bigint AS total_clicks
    FROM base
  )
  SELECT
    delivered, unique_opens, unique_clicks, total_opens, total_clicks,
    CASE WHEN delivered > 0 THEN round((unique_opens::numeric / delivered) * 100, 2) ELSE 0 END AS open_rate,
    CASE WHEN delivered > 0 THEN round((unique_clicks::numeric / delivered) * 100, 2) ELSE 0 END AS click_rate
  FROM agg;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_engagement_stats(INTEGER) TO authenticated;