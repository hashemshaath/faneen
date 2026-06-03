
-- 1) blog_comments: restrict SELECT to comments on published posts
DROP POLICY IF EXISTS "Anyone can view comments" ON public.blog_comments;

CREATE POLICY "Anyone can view comments on published posts"
ON public.blog_comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.blog_posts bp
    WHERE bp.id = blog_comments.post_id
      AND bp.status = 'published'
  )
);

-- 2) provider_landing_metrics: validate INSERT payloads
DROP POLICY IF EXISTS public_insert_metrics ON public.provider_landing_metrics;

CREATE POLICY public_insert_metrics
ON public.provider_landing_metrics
FOR INSERT
TO public
WITH CHECK (
  event_type = ANY (ARRAY[
    'page_view','section_view','cta_click','form_submit',
    'scroll_depth','outbound_click','video_play','engagement'
  ])
  AND (section     IS NULL OR length(section)     <= 80)
  AND (cta_id      IS NULL OR length(cta_id)      <= 80)
  AND (session_id  IS NULL OR length(session_id)  <= 128)
  AND (referrer    IS NULL OR length(referrer)    <= 512)
  AND (utm_source  IS NULL OR length(utm_source)  <= 120)
  AND (utm_medium  IS NULL OR length(utm_medium)  <= 120)
  AND (utm_campaign IS NULL OR length(utm_campaign) <= 200)
  AND (utm_content IS NULL OR length(utm_content) <= 200)
  AND (utm_term    IS NULL OR length(utm_term)    <= 200)
  AND (device      IS NULL OR length(device)      <= 60)
  AND (country     IS NULL OR length(country)     <= 8)
  AND (path        IS NULL OR length(path)        <= 512)
);

-- 3) customer_project_notifications: require owner/manager (not viewer) to insert PII
DROP POLICY IF EXISTS cpn_owner_insert ON public.customer_project_notifications;

CREATE POLICY cpn_owner_insert
ON public.customer_project_notifications
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = customer_project_notifications.business_id
      AND b.user_id = auth.uid()
  )
  OR public.has_business_role(
       auth.uid(),
       business_id,
       ARRAY['owner','manager']::business_staff_role[]
     )
  OR public.has_admin_access(auth.uid())
);
