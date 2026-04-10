-- Add scheduled_at to blog_posts
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL;

-- Create blog_drafts for version history
CREATE TABLE IF NOT EXISTS public.blog_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES public.blog_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  title_ar text NOT NULL DEFAULT '',
  title_en text,
  content_ar text,
  content_en text,
  excerpt_ar text,
  excerpt_en text,
  form_snapshot jsonb DEFAULT '{}'::jsonb,
  version_number integer NOT NULL DEFAULT 1,
  auto_saved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_drafts ENABLE ROW LEVEL SECURITY;

-- Users can manage their own drafts
CREATE POLICY "Users can view own drafts" ON public.blog_drafts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own drafts" ON public.blog_drafts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts" ON public.blog_drafts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all drafts
CREATE POLICY "Admins can view all drafts" ON public.blog_drafts
  FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- Index for fast lookups
CREATE INDEX idx_blog_drafts_post_id ON public.blog_drafts(post_id, created_at DESC);