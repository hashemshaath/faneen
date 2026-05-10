
-- Public read policy for branding settings only
CREATE POLICY "Anyone can view branding settings"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (category = 'branding');

-- Brand assets bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
CREATE POLICY "Brand assets are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

CREATE POLICY "Admins can upload brand assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update brand assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete brand assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'brand-assets' AND public.has_role(auth.uid(), 'admin'));
