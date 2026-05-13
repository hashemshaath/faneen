
-- ============================================================
-- Membership expiry automation
-- ============================================================

-- 1. Process expired subscriptions: flip status to 'expired',
--    downgrade business + profile to 'free', notify user.
CREATE OR REPLACE FUNCTION public.process_expired_memberships()
RETURNS TABLE(processed_count integer, notified_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sub record;
  _processed integer := 0;
  _notified integer := 0;
BEGIN
  FOR _sub IN
    SELECT s.id, s.user_id, s.business_id, s.plan_id,
           p.tier AS plan_tier, p.name_ar, p.name_en
    FROM membership_subscriptions s
    LEFT JOIN membership_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.expires_at IS NOT NULL
      AND s.expires_at < now()
  LOOP
    -- Mark subscription expired
    UPDATE membership_subscriptions
       SET status = 'expired', cancelled_at = now()
     WHERE id = _sub.id;

    -- Downgrade business + profile to free
    IF _sub.business_id IS NOT NULL THEN
      UPDATE businesses SET membership_tier = 'free' WHERE id = _sub.business_id;
    END IF;
    UPDATE profiles SET membership_tier = 'free' WHERE user_id = _sub.user_id;

    -- Notify user (idempotent per subscription)
    INSERT INTO notifications (
      user_id, title_ar, title_en, body_ar, body_en,
      notification_type, reference_type, reference_id, action_url
    )
    SELECT
      _sub.user_id,
      'انتهت صلاحية اشتراكك',
      'Your subscription has expired',
      COALESCE('انتهت صلاحية باقة ' || _sub.name_ar || '. تم إرجاع حسابك للباقة المجانية. يمكنك الترقية في أي وقت.',
               'انتهت صلاحية اشتراكك. تم إرجاع حسابك للباقة المجانية.'),
      COALESCE('Your ' || _sub.name_en || ' plan has expired. Your account has been returned to the Free plan. You can upgrade anytime.',
               'Your subscription expired. Your account has been returned to the Free plan.'),
      'system',
      'membership_subscription_expired',
      _sub.id,
      '/membership'
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = _sub.user_id
        AND n.reference_type = 'membership_subscription_expired'
        AND n.reference_id = _sub.id
    );

    _processed := _processed + 1;
    _notified := _notified + 1;
  END LOOP;

  RETURN QUERY SELECT _processed, _notified;
END;
$$;

REVOKE ALL ON FUNCTION public.process_expired_memberships() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_expired_memberships() TO service_role;

-- 2. Notify users whose subscription expires within 7 or 3 days,
--    once per (subscription, threshold).
CREATE OR REPLACE FUNCTION public.notify_expiring_memberships()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _row record;
  _days_left integer;
  _threshold integer;
  _ref_type text;
  _count integer := 0;
BEGIN
  FOR _row IN
    SELECT s.id, s.user_id, s.expires_at,
           p.name_ar, p.name_en
    FROM membership_subscriptions s
    LEFT JOIN membership_plans p ON p.id = s.plan_id
    WHERE s.status = 'active'
      AND s.expires_at IS NOT NULL
      AND s.expires_at > now()
      AND s.expires_at <= now() + interval '7 days'
  LOOP
    _days_left := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (_row.expires_at - now())) / 86400)::integer);

    IF _days_left <= 3 THEN
      _threshold := 3;
      _ref_type := 'membership_subscription_expiring_3d';
    ELSE
      _threshold := 7;
      _ref_type := 'membership_subscription_expiring_7d';
    END IF;

    INSERT INTO notifications (
      user_id, title_ar, title_en, body_ar, body_en,
      notification_type, reference_type, reference_id, action_url
    )
    SELECT
      _row.user_id,
      'اشتراكك ينتهي قريباً',
      'Your subscription is expiring soon',
      'متبقي ' || _days_left || ' يوم على انتهاء باقة ' || COALESCE(_row.name_ar, '') || '. جدّد الآن لتجنب فقدان المزايا.',
      _days_left || ' day(s) left on your ' || COALESCE(_row.name_en, '') || ' plan. Renew now to keep your benefits.',
      'system',
      _ref_type,
      _row.id,
      '/membership'
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.user_id = _row.user_id
        AND n.reference_type = _ref_type
        AND n.reference_id = _row.id
    );

    IF FOUND THEN _count := _count + 1; END IF;
  END LOOP;

  RETURN _count;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_expiring_memberships() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_expiring_memberships() TO service_role;

-- 3. Schedule daily at 02:00 UTC. Both jobs are idempotent and safe to re-run.
DO $$
BEGIN
  -- Remove any prior versions to avoid duplicates on re-run.
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('process-expired-memberships', 'notify-expiring-memberships');

  PERFORM cron.schedule(
    'process-expired-memberships',
    '0 2 * * *',
    $cron$ SELECT public.process_expired_memberships(); $cron$
  );

  PERFORM cron.schedule(
    'notify-expiring-memberships',
    '15 2 * * *',
    $cron$ SELECT public.notify_expiring_memberships(); $cron$
  );
END $$;
