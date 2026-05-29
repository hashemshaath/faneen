-- Grant Data API access on help center tables
GRANT SELECT ON public.help_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_categories TO authenticated;
GRANT ALL ON public.help_categories TO service_role;

GRANT SELECT ON public.help_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.help_articles TO authenticated;
GRANT ALL ON public.help_articles TO service_role;

-- Public read policies for anonymous visitors (existing authenticated policies are kept)
DROP POLICY IF EXISTS hc_public_read_active ON public.help_categories;
CREATE POLICY hc_public_read_active
  ON public.help_categories
  FOR SELECT
  TO anon
  USING (is_active = true);

DROP POLICY IF EXISTS ha_public_read_published ON public.help_articles;
CREATE POLICY ha_public_read_published
  ON public.help_articles
  FOR SELECT
  TO anon
  USING (status = 'published'::help_article_status);