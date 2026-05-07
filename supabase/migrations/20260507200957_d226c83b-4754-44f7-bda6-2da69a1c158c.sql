CREATE OR REPLACE FUNCTION public.get_home_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _business_count bigint;
  _review_count bigint;
  _project_count bigint;
  _avg_rating numeric;
  _satisfaction int;
BEGIN
  SELECT COUNT(*) INTO _business_count
    FROM public.businesses WHERE is_active = true;

  SELECT COUNT(*) INTO _review_count
    FROM public.reviews;

  SELECT COUNT(*) INTO _project_count
    FROM public.projects WHERE status = 'published';

  SELECT AVG(rating_avg) INTO _avg_rating
    FROM public.businesses
    WHERE is_active = true AND rating_count > 0;

  _satisfaction := COALESCE(ROUND((_avg_rating / 5.0) * 100)::int, 0);

  RETURN jsonb_build_object(
    'businessCount', _business_count,
    'reviewCount', _review_count,
    'projectCount', _project_count,
    'satisfaction', _satisfaction
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_home_stats() TO anon, authenticated;
