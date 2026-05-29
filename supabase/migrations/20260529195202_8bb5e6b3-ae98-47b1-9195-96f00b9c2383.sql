
-- HELP-CENTER-INTELLIGENCE-3 — search logs
CREATE SEQUENCE IF NOT EXISTS public.seq_help_search_log START WITH 1000001;

CREATE TABLE public.help_search_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  query text NOT NULL,
  query_normalized text NOT NULL,
  results_count integer NOT NULL DEFAULT 0,
  selected_article_id uuid REFERENCES public.help_articles(id) ON DELETE SET NULL,
  audience public.help_audience,
  page_key text,
  user_id uuid,
  business_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_help_search_logs_query_norm ON public.help_search_logs(query_normalized);
CREATE INDEX idx_help_search_logs_created_at ON public.help_search_logs(created_at DESC);
CREATE INDEX idx_help_search_logs_zero ON public.help_search_logs(results_count) WHERE results_count = 0;

CREATE OR REPLACE FUNCTION public.set_help_search_log_ref_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN NEW.ref_id := 'HSL-' || nextval('public.seq_help_search_log')::text; END IF;
  IF NEW.user_id IS NULL THEN NEW.user_id := auth.uid(); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_help_search_logs_ref_id BEFORE INSERT ON public.help_search_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_help_search_log_ref_id();

GRANT INSERT ON public.help_search_logs TO authenticated;
GRANT ALL ON public.help_search_logs TO service_role;

ALTER TABLE public.help_search_logs ENABLE ROW LEVEL SECURITY;

-- Authenticated users may insert their own log rows (or anonymous-tracked rows where user_id is null and trigger sets it)
CREATE POLICY "hsl_insert_authenticated" ON public.help_search_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Only admins may read logs (aggregate analytics only)
CREATE POLICY "hsl_admin_read" ON public.help_search_logs
  FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "hsl_admin_all" ON public.help_search_logs
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));
