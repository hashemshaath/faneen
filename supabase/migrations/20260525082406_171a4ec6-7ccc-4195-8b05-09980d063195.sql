-- Tighten branding policy: never expose secret settings publicly
DROP POLICY IF EXISTS "Anyone can view branding settings" ON public.platform_settings;

CREATE POLICY "Anyone can view non-secret branding settings"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (category = 'branding' AND is_secret = false);

-- Lock down realtime.messages so authenticated users cannot subscribe to arbitrary topics.
-- Subscriptions still flow through postgres_changes RLS on the underlying tables,
-- but we explicitly deny broadcast/presence on realtime.messages by default.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users cannot subscribe to arbitrary realtime topics" ON realtime.messages;

CREATE POLICY "Deny realtime messages by default"
ON realtime.messages
FOR SELECT
TO authenticated
USING (false);
