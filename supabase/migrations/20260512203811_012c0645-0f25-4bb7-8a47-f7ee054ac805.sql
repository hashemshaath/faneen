-- 1. Add a per-session attribution token to badge clicks so downstream
--    actions on the profile (contact, booking, phone reveal) can be
--    correlated back to the originating badge click.
ALTER TABLE public.badge_clicks
  ADD COLUMN IF NOT EXISTS session_token text;

CREATE INDEX IF NOT EXISTS idx_badge_clicks_session_token
  ON public.badge_clicks (session_token)
  WHERE session_token IS NOT NULL;

-- 2. Conversion events tied to a badge session.
CREATE TABLE IF NOT EXISTS public.badge_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'profile_view', 'contact', 'booking', 'phone_reveal', 'email_reveal'
  )),
  source_page text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_badge_conversions_business_created
  ON public.badge_conversions (business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_badge_conversions_session
  ON public.badge_conversions (session_token);

ALTER TABLE public.badge_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record badge conversions"
ON public.badge_conversions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Business owners can view their badge conversions"
ON public.badge_conversions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b
    WHERE b.id = badge_conversions.business_id
      AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all badge conversions"
ON public.badge_conversions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));