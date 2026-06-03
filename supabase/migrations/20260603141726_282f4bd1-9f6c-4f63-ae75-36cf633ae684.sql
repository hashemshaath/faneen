
-- 1) business_profile_visibility: restrict public read to non-admin-note rows
DROP POLICY IF EXISTS "bpv_select_all" ON public.business_profile_visibility;

CREATE POLICY "bpv_select_public_safe"
  ON public.business_profile_visibility
  FOR SELECT
  TO anon, authenticated
  USING (admin_note IS NULL AND locked_by_admin = false);

CREATE POLICY "bpv_select_owner_or_admin"
  ON public.business_profile_visibility
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_profile_visibility.business_id
        AND b.user_id = auth.uid()
    )
  );

-- 2) access_violation_log: add length + allowlist guards for anon inserts
DROP POLICY IF EXISTS "avl_insert_anon" ON public.access_violation_log;
DROP POLICY IF EXISTS "Anyone can insert violation logs" ON public.access_violation_log;
DROP POLICY IF EXISTS "anon_insert_access_violation_log" ON public.access_violation_log;

CREATE POLICY "avl_insert_anon_guarded"
  ON public.access_violation_log
  FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL
    AND (ip_address IS NULL OR length(ip_address) <= 64)
    AND (route IS NULL OR length(route) <= 512)
    AND violation_type IN (
      'unauthorized_access','forbidden_route','rate_limit',
      'invalid_token','suspicious_activity','rls_denied','other'
    )
    AND (details IS NULL OR pg_column_size(details) <= 4096)
  );

CREATE POLICY "avl_insert_auth_guarded"
  ON public.access_violation_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (ip_address IS NULL OR length(ip_address) <= 64)
    AND (route IS NULL OR length(route) <= 512)
    AND violation_type IN (
      'unauthorized_access','forbidden_route','rate_limit',
      'invalid_token','suspicious_activity','rls_denied','other'
    )
    AND (details IS NULL OR pg_column_size(details) <= 4096)
  );

-- 3) badge_clicks: enforce length caps
DROP POLICY IF EXISTS "Anyone can insert badge clicks" ON public.badge_clicks;
DROP POLICY IF EXISTS "badge_clicks_insert_all" ON public.badge_clicks;
DROP POLICY IF EXISTS "badge_clicks_insert_public" ON public.badge_clicks;

CREATE POLICY "badge_clicks_insert_guarded"
  ON public.badge_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND (username IS NULL OR length(username) <= 64)
    AND (referrer IS NULL OR length(referrer) <= 512)
    AND (utm_source IS NULL OR length(utm_source) <= 128)
    AND (utm_medium IS NULL OR length(utm_medium) <= 128)
    AND (utm_campaign IS NULL OR length(utm_campaign) <= 128)
    AND (user_agent IS NULL OR length(user_agent) <= 512)
    AND (session_token IS NULL OR length(session_token) <= 128)
  );

-- 4) badge_impressions: enforce length caps + variant allowlist
DROP POLICY IF EXISTS "Anyone can insert badge impressions" ON public.badge_impressions;
DROP POLICY IF EXISTS "badge_impressions_insert_all" ON public.badge_impressions;
DROP POLICY IF EXISTS "badge_impressions_insert_public" ON public.badge_impressions;

CREATE POLICY "badge_impressions_insert_guarded"
  ON public.badge_impressions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND (variant IS NULL OR variant IN ('default','compact','minimal','large','dark','light','badge','sticker'))
    AND (username IS NULL OR length(username) <= 64)
    AND (referrer_host IS NULL OR length(referrer_host) <= 255)
    AND (user_agent IS NULL OR length(user_agent) <= 512)
  );
