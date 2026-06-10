GRANT SELECT ON public.business_taxonomy_categories TO anon, authenticated;
GRANT SELECT ON public.taxonomy_categories TO anon, authenticated;
GRANT ALL ON public.business_taxonomy_categories TO service_role;
GRANT ALL ON public.taxonomy_categories TO service_role;