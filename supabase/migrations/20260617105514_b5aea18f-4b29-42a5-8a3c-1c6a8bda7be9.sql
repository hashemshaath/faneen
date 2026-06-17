GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_requests TO authenticated;
GRANT INSERT ON public.lead_requests TO anon;
GRANT ALL ON public.lead_requests TO service_role;