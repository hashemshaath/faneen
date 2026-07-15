
-- 1. membership_plans: remove bootstrap fallback, require authenticated super_admin
DROP POLICY IF EXISTS "Super admins can manage plans" ON public.membership_plans;
CREATE POLICY "Super admins can manage plans"
ON public.membership_plans
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- 2. system_module_overrides: remove bootstrap fallback, require authenticated super_admin
DROP POLICY IF EXISTS "sysmod_overrides super_admin manage" ON public.system_module_overrides;
CREATE POLICY "sysmod_overrides super_admin manage"
ON public.system_module_overrides
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- 3. Storage: restrict portfolio/project image uploads to authenticated business owners
DROP POLICY IF EXISTS "Users can upload portfolio images" ON storage.objects;
CREATE POLICY "Users can upload portfolio images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can upload project images" ON storage.objects;
CREATE POLICY "Users can upload project images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.user_id = auth.uid())
);
