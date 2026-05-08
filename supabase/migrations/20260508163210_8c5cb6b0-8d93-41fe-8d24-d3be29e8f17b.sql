CREATE OR REPLACE FUNCTION public.get_review_authors(_user_ids uuid[])
RETURNS TABLE(user_id uuid, full_name text, avatar_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _user_ids IS NULL THEN
    RETURN;
  END IF;

  IF array_length(_user_ids, 1) > 100 THEN
    RAISE EXCEPTION 'Too many user IDs (max 100 per call)'
      USING ERRCODE = '22023', HINT = 'batch_too_large';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.full_name, p.avatar_url
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND (
      EXISTS (SELECT 1 FROM public.reviews r WHERE r.user_id = p.user_id)
      OR EXISTS (SELECT 1 FROM public.profile_reviews pr WHERE pr.user_id = p.user_id)
    );
END;
$function$;