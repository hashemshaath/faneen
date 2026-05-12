-- Track clicks coming from external "Verified on Qitaat" badge links.
-- The DashboardBadge generator embeds `?ref=badge&utm_source=workshop_site...`
-- in every snippet; this table persists each landing for in-dashboard analytics.
CREATE TABLE IF NOT EXISTS public.badge_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  username text NOT NULL,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_clicks_business_created
  ON public.badge_clicks (business_id, created_at DESC);

ALTER TABLE public.badge_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) may insert a click event for an
-- existing business. No auth.uid() check — this is public attribution.
CREATE POLICY "Anyone can record badge clicks"
ON public.badge_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only the owner of the business may read their own click events.
CREATE POLICY "Business owners can view their badge clicks"
ON public.badge_clicks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = badge_clicks.business_id
      AND b.user_id = auth.uid()
  )
);

-- Admins may view everything for global analytics.
CREATE POLICY "Admins can view all badge clicks"
ON public.badge_clicks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));