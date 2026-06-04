CREATE TABLE IF NOT EXISTS public.admin_enrichment_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.admin_enrichment_cache TO authenticated;
GRANT ALL ON public.admin_enrichment_cache TO service_role;

ALTER TABLE public.admin_enrichment_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read enrichment cache"
ON public.admin_enrichment_cache FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_admin_enrichment_cache_expires ON public.admin_enrichment_cache(expires_at);