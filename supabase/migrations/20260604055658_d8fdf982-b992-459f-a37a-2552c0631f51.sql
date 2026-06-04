-- Status enum for enrichment sessions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_enrichment_status') THEN
    CREATE TYPE public.admin_enrichment_status AS ENUM ('draft','reviewed','applied','discarded');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.admin_enrichment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  website_url TEXT,
  maps_url TEXT,
  status public.admin_enrichment_status NOT NULL DEFAULT 'draft',
  sources JSONB NOT NULL DEFAULT '{}'::jsonb,
  merged JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  applied_entity_type TEXT,
  applied_entity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.admin_enrichment_sessions TO authenticated;
GRANT ALL ON public.admin_enrichment_sessions TO service_role;

ALTER TABLE public.admin_enrichment_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage enrichment sessions" ON public.admin_enrichment_sessions;
CREATE POLICY "Admins manage enrichment sessions"
  ON public.admin_enrichment_sessions
  FOR ALL
  TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_admin_enrichment_sessions_actor
  ON public.admin_enrichment_sessions(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_enrichment_sessions_status
  ON public.admin_enrichment_sessions(status, created_at DESC);

-- updated_at trigger (re-use existing helper if present)
CREATE OR REPLACE FUNCTION public.tg_admin_enrichment_sessions_touch()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_enrichment_sessions_touch ON public.admin_enrichment_sessions;
CREATE TRIGGER trg_admin_enrichment_sessions_touch
  BEFORE UPDATE ON public.admin_enrichment_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_admin_enrichment_sessions_touch();