-- ═════════ RUM: Real User Web Vitals ═════════
CREATE TABLE public.web_vitals_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_rating text,
  page_path text NOT NULL,
  user_agent text,
  connection_type text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wve_created ON public.web_vitals_events(created_at DESC);
CREATE INDEX idx_wve_metric  ON public.web_vitals_events(metric_name, created_at DESC);
CREATE INDEX idx_wve_path    ON public.web_vitals_events(page_path, created_at DESC);

ALTER TABLE public.web_vitals_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit web vitals"
  ON public.web_vitals_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    metric_name = ANY (ARRAY['LCP','CLS','INP','FCP','TTFB'])
    AND length(page_path) <= 500
    AND length(coalesce(user_agent,'')) <= 500
  );

CREATE POLICY "Admins can read web vitals"
  ON public.web_vitals_events FOR SELECT TO authenticated
  USING (has_admin_access(auth.uid()));

-- ═════════ Lab: PageSpeed snapshots ═════════
CREATE TABLE public.perf_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  strategy text NOT NULL DEFAULT 'mobile',
  performance_score integer,
  accessibility_score integer,
  best_practices_score integer,
  seo_score integer,
  lcp_ms numeric,
  cls numeric,
  tbt_ms numeric,
  fcp_ms numeric,
  ttfb_ms numeric,
  speed_index_ms numeric,
  raw_summary jsonb DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'pagespeed',
  triggered_by uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_par_created ON public.perf_audit_runs(created_at DESC);
CREATE INDEX idx_par_url     ON public.perf_audit_runs(url, strategy, created_at DESC);

ALTER TABLE public.perf_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage perf audits"
  ON public.perf_audit_runs FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- ═════════ SEO audit snapshots ═════════
CREATE TABLE public.seo_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  robots_ok boolean,
  robots_status integer,
  robots_has_sitemap boolean,
  sitemap_ok boolean,
  sitemap_status integer,
  sitemap_url_count integer,
  pages_checked integer DEFAULT 0,
  pages_passed integer DEFAULT 0,
  page_results jsonb DEFAULT '[]'::jsonb,
  triggered_by uuid,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sar_created ON public.seo_audit_runs(created_at DESC);

ALTER TABLE public.seo_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seo audits"
  ON public.seo_audit_runs FOR ALL TO authenticated
  USING (has_admin_access(auth.uid()))
  WITH CHECK (has_admin_access(auth.uid()));

-- ═════════ Aggregation function ═════════
CREATE OR REPLACE FUNCTION public.get_web_vitals_summary(_hours integer DEFAULT 24)
RETURNS TABLE (
  metric_name text,
  sample_count bigint,
  p50 numeric,
  p75 numeric,
  p95 numeric,
  good_pct numeric
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    metric_name,
    COUNT(*)::bigint AS sample_count,
    ROUND(percentile_cont(0.50) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p50,
    ROUND(percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p75,
    ROUND(percentile_cont(0.95) WITHIN GROUP (ORDER BY metric_value)::numeric, 2) AS p95,
    ROUND(
      (COUNT(*) FILTER (WHERE metric_rating = 'good')::numeric / NULLIF(COUNT(*),0)::numeric) * 100,
      1
    ) AS good_pct
  FROM public.web_vitals_events
  WHERE created_at >= now() - make_interval(hours => GREATEST(_hours, 1))
    AND has_admin_access(auth.uid())
  GROUP BY metric_name
  ORDER BY metric_name;
$$;

-- ═════════ Cleanup function (90-day retention) ═════════
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_data()
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.web_vitals_events WHERE created_at < now() - interval '90 days';
  DELETE FROM public.perf_audit_runs   WHERE created_at < now() - interval '90 days';
  DELETE FROM public.seo_audit_runs    WHERE created_at < now() - interval '90 days';
$$;