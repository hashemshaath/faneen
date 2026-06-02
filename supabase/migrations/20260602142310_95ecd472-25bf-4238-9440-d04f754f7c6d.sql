-- Restore public read access to the safe business views.
-- Without these GRANTs the anon/authenticated PostgREST roles cannot reach
-- the masked public views, which breaks public profile pages like /:username.
GRANT SELECT ON public.businesses_public TO anon, authenticated;
GRANT SELECT ON public.business_branches_public TO anon, authenticated;