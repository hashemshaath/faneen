
CREATE TABLE public.provider_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('section_view', 'card_click', 'view_all_click')),
  provider_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  provider_username TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_provider_interactions_event ON public.provider_interactions(event_type);
CREATE INDEX idx_provider_interactions_provider ON public.provider_interactions(provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX idx_provider_interactions_created ON public.provider_interactions(created_at DESC);

ALTER TABLE public.provider_interactions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert interaction events (anonymous tracking)
CREATE POLICY "Anyone can insert interactions"
  ON public.provider_interactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read interaction data
CREATE POLICY "Admins can read interactions"
  ON public.provider_interactions FOR SELECT
  TO authenticated
  USING (public.has_admin_access(auth.uid()));
