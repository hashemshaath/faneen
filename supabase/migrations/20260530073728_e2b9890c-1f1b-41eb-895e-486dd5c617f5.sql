REVOKE ALL ON FUNCTION public.grant_loyalty_points(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_loyalty_points(UUID, INTEGER, TEXT, TEXT) TO service_role;