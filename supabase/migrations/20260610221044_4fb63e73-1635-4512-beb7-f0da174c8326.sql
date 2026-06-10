
DROP POLICY IF EXISTS branch_visits_insert_all ON public.branch_visits;

CREATE POLICY branch_visits_insert_constrained
  ON public.branch_visits
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type = ANY (ARRAY['view','phone_reveal','whatsapp_click','share','favorite'])
    AND visitor_hash IS NOT NULL
    AND length(visitor_hash) BETWEEN 8 AND 128
    AND business_id IS NOT NULL
    AND branch_id IS NOT NULL
  );

CREATE POLICY portfolio_item_views_insert_constrained
  ON public.portfolio_item_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    event_type = ANY (ARRAY['view','share','click'])
    AND portfolio_item_id IS NOT NULL
    AND business_id IS NOT NULL
    AND (session_id IS NULL OR length(session_id) <= 128)
    AND (user_agent IS NULL OR length(user_agent) <= 512)
    AND (referrer IS NULL OR length(referrer) <= 2048)
    AND (viewer_user_id IS NULL OR viewer_user_id = auth.uid())
  );
