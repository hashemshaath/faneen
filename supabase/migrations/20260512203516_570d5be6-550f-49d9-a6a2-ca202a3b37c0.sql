-- Records every render of the embedded "Verified on Qitaat" badge.
-- Paired with `badge_clicks` to compute Click-Through Rate (CTR) per workshop.
CREATE TABLE IF NOT EXISTS public.badge_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  username text NOT NULL,
  variant text,
  referrer_host text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_impressions_business_created
  ON public.badge_impressions (business_id, created_at DESC);

ALTER TABLE public.badge_impressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record badge impressions"
ON public.badge_impressions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Business owners can view their badge impressions"
ON public.badge_impressions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = badge_impressions.business_id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all badge impressions"
ON public.badge_impressions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));