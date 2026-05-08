CREATE OR REPLACE FUNCTION public.get_review_authors(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND (
      EXISTS (SELECT 1 FROM public.reviews r WHERE r.user_id = p.user_id)
      OR EXISTS (SELECT 1 FROM public.profile_reviews pr WHERE pr.user_id = p.user_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_review_authors(uuid[]) TO anon, authenticated;