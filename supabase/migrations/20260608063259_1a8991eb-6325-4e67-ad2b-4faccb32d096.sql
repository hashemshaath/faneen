ALTER TABLE public.web_vitals_events
  ADD COLUMN IF NOT EXISTS route_key TEXT,
  ADD COLUMN IF NOT EXISTS image_count INTEGER,
  ADD COLUMN IF NOT EXISTS lcp_url TEXT;

CREATE INDEX IF NOT EXISTS web_vitals_events_route_metric_idx
  ON public.web_vitals_events (route_key, metric_name, created_at DESC);

CREATE INDEX IF NOT EXISTS web_vitals_events_created_at_idx
  ON public.web_vitals_events (created_at DESC);