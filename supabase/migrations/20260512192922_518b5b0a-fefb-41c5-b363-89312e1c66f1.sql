ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS guide_topic text;

CREATE INDEX IF NOT EXISTS idx_blog_posts_guide_topic
  ON public.blog_posts (guide_topic)
  WHERE category = 'guides';