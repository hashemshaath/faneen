CREATE TABLE IF NOT EXISTS public.google_api_usage_log (
  id BIGSERIAL PRIMARY KEY,
  api TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ok','error')),
  latency_ms INTEGER,
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_google_api_usage_log_created_at ON public.google_api_usage_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_google_api_usage_log_api_created_at ON public.google_api_usage_log (api, created_at DESC);

GRANT SELECT ON public.google_api_usage_log TO authenticated;
GRANT ALL ON public.google_api_usage_log TO service_role;

ALTER TABLE public.google_api_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read google api usage log" ON public.google_api_usage_log;
CREATE POLICY "Admins can read google api usage log"
  ON public.google_api_usage_log
  FOR SELECT
  TO authenticated
  USING (public.has_admin_access(auth.uid()));