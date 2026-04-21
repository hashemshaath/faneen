
CREATE TABLE IF NOT EXISTS public.sitemap_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  sitemap_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success','failed','skipped','pending')),
  http_status INTEGER,
  message TEXT,
  url_count INTEGER,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_source TEXT NOT NULL DEFAULT 'manual',
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sitemap_submissions_created_at
  ON public.sitemap_submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sitemap_submissions_provider_status
  ON public.sitemap_submissions (provider, status, created_at DESC);

ALTER TABLE public.sitemap_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view sitemap submissions"
ON public.sitemap_submissions FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Admins insert sitemap submissions"
ON public.sitemap_submissions FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);
