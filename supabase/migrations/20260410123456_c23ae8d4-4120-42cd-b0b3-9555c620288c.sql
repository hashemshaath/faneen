
-- Admin can manage categories
CREATE POLICY "Admins can insert categories"
ON public.categories FOR INSERT TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can update categories"
ON public.categories FOR UPDATE TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete categories"
ON public.categories FOR DELETE TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Admin can manage tags
CREATE POLICY "Admins can insert tags"
ON public.tags FOR INSERT TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can update tags"
ON public.tags FOR UPDATE TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete tags"
ON public.tags FOR DELETE TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Admin can manage cities
CREATE POLICY "Admins can insert cities"
ON public.cities FOR INSERT TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can update cities"
ON public.cities FOR UPDATE TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can delete cities"
ON public.cities FOR DELETE TO authenticated
USING (public.has_admin_access(auth.uid()));

-- Admin can manage all businesses (verify, activate, etc.)
CREATE POLICY "Admins can update all businesses"
ON public.businesses FOR UPDATE TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can view all businesses"
ON public.businesses FOR SELECT TO authenticated
USING (public.has_admin_access(auth.uid()));
