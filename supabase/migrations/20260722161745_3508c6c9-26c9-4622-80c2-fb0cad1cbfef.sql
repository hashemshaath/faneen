DROP POLICY IF EXISTS "bsc select" ON public.business_service_countries;
CREATE POLICY "bsc select" ON public.business_service_countries
FOR SELECT
USING (
  (
    EXISTS (
      SELECT 1 FROM public.country_settings cs
      WHERE cs.country_id = business_service_countries.country_id
        AND cs.is_launched = true
    )
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_service_countries.business_id
        AND b.is_active = true
        AND b.approval_status = 'published'::business_approval_status
        AND b.is_demo = false
    )
  )
  OR is_business_owner_or_manager(auth.uid(), business_id)
  OR is_business_staff(auth.uid(), business_id)
  OR has_admin_access(auth.uid())
);

DROP POLICY IF EXISTS "hcg_insert_authenticated" ON public.help_content_gaps;
CREATE POLICY "hcg_insert_authenticated" ON public.help_content_gaps
FOR INSERT TO authenticated
WITH CHECK (
  (submitted_by IS NULL OR submitted_by = auth.uid())
  AND char_length(last_query) BETWEEN 1 AND 500
  AND char_length(query_normalized) BETWEEN 1 AND 500
  AND char_length(dedupe_key) BETWEEN 1 AND 512
  AND (page_key IS NULL OR char_length(page_key) <= 128)
  AND (suggested_title_ar IS NULL OR char_length(suggested_title_ar) <= 200)
  AND (suggested_title_en IS NULL OR char_length(suggested_title_en) <= 200)
  AND frequency BETWEEN 0 AND 100000
  AND zero_result_count BETWEEN 0 AND 100000
);

DROP POLICY IF EXISTS "hsl_insert_authenticated" ON public.help_search_logs;
CREATE POLICY "hsl_insert_authenticated" ON public.help_search_logs
FOR INSERT TO authenticated
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
  AND char_length(query) BETWEEN 1 AND 500
  AND char_length(query_normalized) BETWEEN 1 AND 500
  AND (page_key IS NULL OR char_length(page_key) <= 128)
  AND results_count BETWEEN 0 AND 100000
);