
-- 1) contact_messages: tighten public INSERT
DROP POLICY IF EXISTS "Anyone can submit contact message" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact message"
ON public.contact_messages
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND status = 'new'
  AND priority IN ('low','normal')
  AND starred = false
  AND internal_notes IS NULL
  AND replied_at IS NULL
  AND replied_by IS NULL
  AND length(name) BETWEEN 1 AND 200
  AND length(email) BETWEEN 3 AND 254
  AND length(message) BETWEEN 1 AND 5000
  AND (subject IS NULL OR length(subject) <= 300)
);

-- 2) content_interactions: tighten public INSERT
DROP POLICY IF EXISTS "Anyone can insert interactions" ON public.content_interactions;
CREATE POLICY "Anyone can insert interactions"
ON public.content_interactions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND event_type IN ('view','save','share','click','unsave','unshare')
  AND content_type IN ('blog','project','profile_system','promotion','business','service')
);

-- 3) provider_interactions: tighten public INSERT
DROP POLICY IF EXISTS "Anyone can insert interactions" ON public.provider_interactions;
CREATE POLICY "Anyone can insert interactions"
ON public.provider_interactions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND event_type IN ('view','contact_click','phone_click','whatsapp_click','website_click','share','save','unsave')
);

-- 4) email_deliverability_alerts: lock down INSERT (service_role bypasses RLS)
DROP POLICY IF EXISTS "Service role inserts email alerts" ON public.email_deliverability_alerts;
CREATE POLICY "No client inserts to email alerts"
ON public.email_deliverability_alerts
FOR INSERT
TO anon, authenticated
WITH CHECK (false);
