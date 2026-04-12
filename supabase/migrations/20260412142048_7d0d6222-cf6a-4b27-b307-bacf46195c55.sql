CREATE OR REPLACE FUNCTION public.increment_blog_views(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.blog_posts
  SET views_count = views_count + 1
  WHERE id = _post_id AND status = 'published';
END;
$$;