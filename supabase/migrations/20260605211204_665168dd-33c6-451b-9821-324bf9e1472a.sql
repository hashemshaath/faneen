-- PROVIDER-GROWTH-ENGINE-1 — Part D: provider_growth_pipeline
DO $$ BEGIN
  CREATE TYPE public.provider_growth_stage AS ENUM (
    'discovered','imported','enriched','review_pending','verified','published','rejected','archived'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.provider_growth_pipeline (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id     uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  lead_id         uuid,
  stage           public.provider_growth_stage NOT NULL DEFAULT 'discovered',
  previous_stage  public.provider_growth_stage,
  source          text,
  source_ref      text,
  readiness_score integer,
  quality_score   integer,
  assigned_to     uuid,
  reviewed_by     uuid,
  verified_by     uuid,
  reviewed_at     timestamptz,
  verified_at     timestamptz,
  published_at    timestamptz,
  notes           text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provider_growth_pipeline_target_chk CHECK (business_id IS NOT NULL OR lead_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS provider_growth_pipeline_business_uniq
  ON public.provider_growth_pipeline(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS provider_growth_pipeline_stage_idx
  ON public.provider_growth_pipeline(stage);
CREATE INDEX IF NOT EXISTS provider_growth_pipeline_assigned_idx
  ON public.provider_growth_pipeline(assigned_to) WHERE assigned_to IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_growth_pipeline TO authenticated;
GRANT ALL ON public.provider_growth_pipeline TO service_role;

ALTER TABLE public.provider_growth_pipeline ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pgp_admin_select ON public.provider_growth_pipeline;
CREATE POLICY pgp_admin_select ON public.provider_growth_pipeline
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS pgp_admin_insert ON public.provider_growth_pipeline;
CREATE POLICY pgp_admin_insert ON public.provider_growth_pipeline
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS pgp_admin_update ON public.provider_growth_pipeline;
CREATE POLICY pgp_admin_update ON public.provider_growth_pipeline
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS pgp_admin_delete ON public.provider_growth_pipeline;
CREATE POLICY pgp_admin_delete ON public.provider_growth_pipeline
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Stage transition guard: enforce verification + review gates, no direct-publish jumps.
CREATE OR REPLACE FUNCTION public.enforce_provider_growth_stage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stage <> OLD.stage THEN
    NEW.previous_stage := OLD.stage;
    IF NEW.stage = 'published' AND OLD.stage <> 'verified' THEN
      RAISE EXCEPTION 'provider_growth_pipeline: cannot publish without prior verification (was %)', OLD.stage
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.stage = 'verified' AND OLD.stage NOT IN ('review_pending','verified') THEN
      RAISE EXCEPTION 'provider_growth_pipeline: cannot verify before review (was %)', OLD.stage
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.stage = 'verified' AND NEW.verified_at IS NULL THEN NEW.verified_at := now(); END IF;
    IF NEW.stage = 'published' AND NEW.published_at IS NULL THEN NEW.published_at := now(); END IF;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.stage = 'published' THEN
    RAISE EXCEPTION 'provider_growth_pipeline: cannot insert a row directly in published stage'
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_provider_growth_stage ON public.provider_growth_pipeline;
CREATE TRIGGER trg_provider_growth_stage
  BEFORE INSERT OR UPDATE ON public.provider_growth_pipeline
  FOR EACH ROW EXECUTE FUNCTION public.enforce_provider_growth_stage();