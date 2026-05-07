
CREATE TABLE public.sitemap_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  triggered_by text NOT NULL DEFAULT 'cron',
  total_endpoints int NOT NULL DEFAULT 0,
  ok_count int NOT NULL DEFAULT 0,
  error_count int NOT NULL DEFAULT 0,
  total_urls int NOT NULL DEFAULT 0,
  has_spa_fallback boolean NOT NULL DEFAULT false,
  has_failures boolean NOT NULL DEFAULT false,
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  robots_check jsonb NOT NULL DEFAULT '[]'::jsonb,
  diff_from_previous jsonb NOT NULL DEFAULT '{}'::jsonb,
  alert_sent boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_sitemap_audit_runs_created_at ON public.sitemap_audit_runs (created_at DESC);

ALTER TABLE public.sitemap_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sitemap audit runs"
  ON public.sitemap_audit_runs FOR SELECT
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admins can insert sitemap audit runs"
  ON public.sitemap_audit_runs FOR INSERT
  WITH CHECK (public.has_admin_access(auth.uid()));
