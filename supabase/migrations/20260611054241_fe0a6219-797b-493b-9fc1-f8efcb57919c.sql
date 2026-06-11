CREATE POLICY "Admins can insert services for any business"
ON public.business_services
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()));