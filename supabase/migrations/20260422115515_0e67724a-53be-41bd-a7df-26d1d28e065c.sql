
-- Unified content interaction tracking
CREATE TABLE public.content_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('blog', 'project', 'profile_system', 'promotion', 'business')),
  content_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'save', 'share')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for fast queries
CREATE INDEX idx_content_interactions_content ON public.content_interactions (content_type, content_id);
CREATE INDEX idx_content_interactions_event ON public.content_interactions (event_type);
CREATE INDEX idx_content_interactions_created ON public.content_interactions (created_at DESC);
CREATE INDEX idx_content_interactions_user ON public.content_interactions (user_id) WHERE user_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.content_interactions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert interactions (anonymous + authenticated)
CREATE POLICY "Anyone can insert interactions"
ON public.content_interactions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read all interactions
CREATE POLICY "Admins can read all interactions"
ON public.content_interactions
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Users can read their own interactions
CREATE POLICY "Users can read own interactions"
ON public.content_interactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Function to track and sync counters
CREATE OR REPLACE FUNCTION public.track_content_interaction(
  _content_type TEXT,
  _content_id UUID,
  _event_type TEXT,
  _session_id TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _interaction_id UUID;
  _user_id UUID;
BEGIN
  _user_id := auth.uid();

  -- Dedupe views per session
  IF _event_type = 'view' AND _session_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.content_interactions
      WHERE content_type = _content_type
        AND content_id = _content_id
        AND event_type = 'view'
        AND session_id = _session_id
    ) THEN
      RETURN NULL;
    END IF;
  END IF;

  -- Insert the interaction
  INSERT INTO public.content_interactions (content_type, content_id, event_type, user_id, session_id, metadata)
  VALUES (_content_type, _content_id, _event_type, _user_id, _session_id, _metadata)
  RETURNING id INTO _interaction_id;

  -- Sync counters on source tables
  IF _event_type = 'view' THEN
    IF _content_type = 'blog' THEN
      UPDATE public.blog_posts SET views_count = views_count + 1 WHERE id = _content_id;
    ELSIF _content_type = 'project' THEN
      UPDATE public.projects SET views_count = views_count + 1 WHERE id = _content_id;
    ELSIF _content_type = 'profile_system' THEN
      UPDATE public.profile_systems SET views_count = views_count + 1 WHERE id = _content_id;
    ELSIF _content_type = 'promotion' THEN
      UPDATE public.promotions SET views_count = views_count + 1 WHERE id = _content_id;
    END IF;
  ELSIF _event_type = 'save' THEN
    IF _content_type = 'project' THEN
      UPDATE public.projects SET saves_count = saves_count + 1 WHERE id = _content_id;
    END IF;
  ELSIF _event_type = 'share' THEN
    IF _content_type = 'project' THEN
      UPDATE public.projects SET shares_count = shares_count + 1 WHERE id = _content_id;
    END IF;
  END IF;

  RETURN _interaction_id;
END;
$$;
