
CREATE TABLE public.blog_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

ALTER TABLE public.blog_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
ON public.blog_bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own bookmarks"
ON public.blog_bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own bookmarks"
ON public.blog_bookmarks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_blog_bookmarks_user ON public.blog_bookmarks(user_id);
CREATE INDEX idx_blog_bookmarks_post ON public.blog_bookmarks(post_id);
