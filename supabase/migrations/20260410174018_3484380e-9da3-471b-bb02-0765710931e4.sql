
-- Function to increment promotion views
CREATE OR REPLACE FUNCTION public.increment_promotion_views(_promotion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE promotions SET views_count = views_count + 1 WHERE id = _promotion_id;
END;
$$;

-- Allow public to call this function
GRANT EXECUTE ON FUNCTION public.increment_promotion_views(uuid) TO anon, authenticated;
