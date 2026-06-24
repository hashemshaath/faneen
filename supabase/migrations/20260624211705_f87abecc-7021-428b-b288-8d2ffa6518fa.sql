CREATE POLICY "ctv_published_read" ON public.contract_template_versions
  FOR SELECT TO authenticated
  USING (status = 'published');
GRANT SELECT ON public.contract_template_versions TO authenticated;