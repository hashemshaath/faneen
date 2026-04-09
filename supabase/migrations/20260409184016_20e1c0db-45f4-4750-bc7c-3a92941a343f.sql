
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('project-images', 'project-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio-images', 'portfolio-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('business-assets', 'business-assets', true) ON CONFLICT (id) DO NOTHING;

-- Public read access for all buckets
CREATE POLICY "Public read access for project images" ON storage.objects FOR SELECT USING (bucket_id = 'project-images');
CREATE POLICY "Public read access for blog images" ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "Public read access for portfolio images" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio-images');
CREATE POLICY "Public read access for business assets" ON storage.objects FOR SELECT USING (bucket_id = 'business-assets');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload project images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload blog images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload portfolio images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can upload business assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'business-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can update their own files
CREATE POLICY "Users can update own project images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'project-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own blog images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'blog-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own portfolio images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'portfolio-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can update own business assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'business-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Users can delete their own files
CREATE POLICY "Users can delete own project images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own blog images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'blog-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own portfolio images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'portfolio-images' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can delete own business assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'business-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
