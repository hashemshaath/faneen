
-- Fix 1: contact_inbox_settings - restrict UPDATE to super_admin (align with SELECT)
DROP POLICY IF EXISTS "Admins update inbox settings" ON public.contact_inbox_settings;
CREATE POLICY "Super admins update inbox settings"
  ON public.contact_inbox_settings
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Fix 2: contract_taxonomy_categories - only expose template links for published versions
DROP POLICY IF EXISTS ctc_read_template_links ON public.contract_taxonomy_categories;
CREATE POLICY ctc_read_template_links
  ON public.contract_taxonomy_categories
  FOR SELECT
  TO anon, authenticated
  USING (
    template_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.contract_template_versions v
      WHERE v.id = contract_taxonomy_categories.template_id
        AND v.status = 'published'
    )
  );

-- Fix 3: reviews - restrict public SELECT to reviews of published, non-demo businesses (and branches when set)
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable for published businesses"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (
    is_demo = false
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = reviews.business_id
        AND b.approval_status = 'published'
        AND b.is_demo = false
        AND b.is_active = true
    )
    AND (
      branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.business_branches br
        WHERE br.id = reviews.branch_id
          AND br.is_active = true
      )
    )
  );
