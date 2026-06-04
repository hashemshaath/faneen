
-- DATA-ENRICHMENT-GOVERNANCE-1: Unified data enrichment governance tables

-- 1. Sources registry
CREATE TABLE public.data_enrichment_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label_ar TEXT NOT NULL,
  label_en TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('external_api','crawler','manual','import','registration')),
  trust_weight NUMERIC(3,2) NOT NULL DEFAULT 0.50 CHECK (trust_weight >= 0 AND trust_weight <= 1),
  requires_review BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.data_enrichment_sources TO authenticated;
GRANT ALL ON public.data_enrichment_sources TO service_role;
ALTER TABLE public.data_enrichment_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sources" ON public.data_enrichment_sources
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));
CREATE POLICY "Authenticated read active sources" ON public.data_enrichment_sources
  FOR SELECT TO authenticated USING (active = true);

-- Seed registry
INSERT INTO public.data_enrichment_sources (key, label_ar, label_en, kind, trust_weight, requires_review) VALUES
  ('google_places',        'جوجل بليسز',           'Google Places',         'external_api', 0.90, true),
  ('google_maps',          'جوجل ماب',              'Google Maps',           'external_api', 0.85, true),
  ('firecrawl_website',    'فايركرول',              'Firecrawl Website',     'crawler',      0.70, true),
  ('website_crawl',        'زحف الموقع',            'Website Crawl',         'crawler',      0.65, true),
  ('national_address',     'العنوان الوطني',         'National Address',      'external_api', 0.95, false),
  ('manual_admin',         'إدخال يدوي',            'Manual Admin Entry',    'manual',       0.80, false),
  ('provider_registration','تسجيل مزود',            'Provider Registration', 'registration', 0.75, true),
  ('supplier_import',      'استيراد مورد',          'Supplier Import',       'import',       0.60, true),
  ('csv_import',           'استيراد CSV',           'CSV Import',            'import',       0.55, true),
  ('brand_import',         'استيراد علامة',         'Brand Import',          'import',       0.65, true),
  ('future_api',           'واجهة مستقبلية',        'Future API',            'external_api', 0.50, true)
ON CONFLICT (key) DO NOTHING;

-- 2. Records
CREATE TABLE public.data_enrichment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_key TEXT NOT NULL REFERENCES public.data_enrichment_sources(key),
  external_ref TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  normalized JSONB NOT NULL DEFAULT '{}'::jsonb,
  translated JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  conflicts JSONB NOT NULL DEFAULT '[]'::jsonb,
  quality_score INT NOT NULL DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  status TEXT NOT NULL DEFAULT 'imported' CHECK (status IN ('imported','normalized','enriched','pending_review','approved','rejected','applied')),
  target_entity_type TEXT,
  target_entity_id UUID,
  created_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_de_records_status ON public.data_enrichment_records (status);
CREATE INDEX idx_de_records_source ON public.data_enrichment_records (source_key);
CREATE INDEX idx_de_records_target ON public.data_enrichment_records (target_entity_type, target_entity_id);
GRANT SELECT, INSERT, UPDATE ON public.data_enrichment_records TO authenticated;
GRANT ALL ON public.data_enrichment_records TO service_role;
ALTER TABLE public.data_enrichment_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage records" ON public.data_enrichment_records
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

-- 3. Audit (append-only)
CREATE TABLE public.data_enrichment_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID REFERENCES public.data_enrichment_records(id) ON DELETE CASCADE,
  field TEXT,
  old_value TEXT,
  new_value TEXT,
  source_key TEXT,
  actor_id UUID,
  action TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_de_audit_record ON public.data_enrichment_audit (record_id);
CREATE INDEX idx_de_audit_created ON public.data_enrichment_audit (created_at DESC);
GRANT SELECT, INSERT ON public.data_enrichment_audit TO authenticated;
GRANT ALL ON public.data_enrichment_audit TO service_role;
ALTER TABLE public.data_enrichment_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit" ON public.data_enrichment_audit
  FOR SELECT TO authenticated USING (public.has_admin_access(auth.uid()));
CREATE POLICY "Admins insert audit" ON public.data_enrichment_audit
  FOR INSERT TO authenticated WITH CHECK (public.has_admin_access(auth.uid()));

-- Forbid update / delete on audit
CREATE OR REPLACE FUNCTION public.data_enrichment_audit_forbid_mod()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'data_enrichment_audit is append-only';
END;
$$;
CREATE TRIGGER trg_de_audit_no_update BEFORE UPDATE OR DELETE ON public.data_enrichment_audit
  FOR EACH ROW EXECUTE FUNCTION public.data_enrichment_audit_forbid_mod();

-- 4. Quality snapshots
CREATE TABLE public.data_enrichment_quality_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_de_quality_entity ON public.data_enrichment_quality_snapshots (entity_type, entity_id, created_at DESC);
GRANT SELECT, INSERT ON public.data_enrichment_quality_snapshots TO authenticated;
GRANT ALL ON public.data_enrichment_quality_snapshots TO service_role;
ALTER TABLE public.data_enrichment_quality_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read quality" ON public.data_enrichment_quality_snapshots
  FOR SELECT TO authenticated USING (public.has_admin_access(auth.uid()));
CREATE POLICY "Admins insert quality" ON public.data_enrichment_quality_snapshots
  FOR INSERT TO authenticated WITH CHECK (public.has_admin_access(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_de_sources_touch BEFORE UPDATE ON public.data_enrichment_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_de_records_touch BEFORE UPDATE ON public.data_enrichment_records
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
