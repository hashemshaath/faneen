
-- ============================================================
-- ASSET-MANAGEMENT-MICROSERVICE-1
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.asset_status AS ENUM ('available','rented','reserved','maintenance','inspection','retired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_maintenance_status AS ENUM ('planned','in_progress','completed','overdue','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_maintenance_kind AS ENUM ('preventive','corrective','emergency','calibration');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_inspection_frequency AS ENUM ('daily','weekly','monthly','quarterly','annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_inspection_result AS ENUM ('pending','passed','failed','needs_attention');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sequences for ref ids
CREATE SEQUENCE IF NOT EXISTS public.asset_category_seq START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.asset_seq START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.asset_maintenance_seq START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.asset_inspection_seq START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.asset_alert_seq START 1000000;

-- ------------------------------------------------------------
-- 1) asset_categories
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT ('ACAT-' || nextval('public.asset_category_seq')::text),
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.asset_categories TO authenticated;
GRANT ALL ON public.asset_categories TO service_role;
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "asset_categories read auth" ON public.asset_categories
  FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "asset_categories admin write" ON public.asset_categories
  FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ------------------------------------------------------------
-- 2) assets
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT ('AST-' || nextval('public.asset_seq')::text),
  owner_business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  serial_number TEXT,
  manufacturer TEXT,
  model TEXT,
  year_manufactured INTEGER,
  purchase_date DATE,
  purchase_cost NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'SAR',
  current_location TEXT,
  city_id UUID,
  status public.asset_status NOT NULL DEFAULT 'available',
  condition_rating SMALLINT CHECK (condition_rating BETWEEN 0 AND 10),
  next_maintenance_at DATE,
  next_inspection_at DATE,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  retired_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_owner ON public.assets(owner_business_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(category_id);
CREATE INDEX IF NOT EXISTS idx_assets_next_maint ON public.assets(next_maintenance_at);
CREATE INDEX IF NOT EXISTS idx_assets_next_insp ON public.assets(next_inspection_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets owner read" ON public.assets FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = owner_business_id AND b.user_id = auth.uid())
  );
CREATE POLICY "assets owner write" ON public.assets FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = owner_business_id AND b.user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = owner_business_id AND b.user_id = auth.uid())
  );

-- ------------------------------------------------------------
-- 3) asset_maintenance
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT ('AMNT-' || nextval('public.asset_maintenance_seq')::text),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  kind public.asset_maintenance_kind NOT NULL DEFAULT 'preventive',
  status public.asset_maintenance_status NOT NULL DEFAULT 'planned',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_for DATE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cost NUMERIC(14,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  performed_by TEXT,
  next_due_at DATE,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_amnt_asset ON public.asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_amnt_status ON public.asset_maintenance(status);
CREATE INDEX IF NOT EXISTS idx_amnt_scheduled ON public.asset_maintenance(scheduled_for);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_maintenance TO authenticated;
GRANT ALL ON public.asset_maintenance TO service_role;
ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "amnt owner access" ON public.asset_maintenance FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.assets a JOIN public.businesses b ON b.id = a.owner_business_id
      WHERE a.id = asset_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.assets a JOIN public.businesses b ON b.id = a.owner_business_id
      WHERE a.id = asset_id AND b.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 4) asset_inspections
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT ('AINS-' || nextval('public.asset_inspection_seq')::text),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  frequency public.asset_inspection_frequency NOT NULL DEFAULT 'monthly',
  result public.asset_inspection_result NOT NULL DEFAULT 'pending',
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  scheduled_for DATE,
  inspected_at TIMESTAMPTZ,
  inspector_name TEXT,
  notes TEXT,
  next_due_at DATE,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ains_asset ON public.asset_inspections(asset_id);
CREATE INDEX IF NOT EXISTS idx_ains_scheduled ON public.asset_inspections(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_ains_result ON public.asset_inspections(result);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_inspections TO authenticated;
GRANT ALL ON public.asset_inspections TO service_role;
ALTER TABLE public.asset_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ains owner access" ON public.asset_inspections FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.assets a JOIN public.businesses b ON b.id = a.owner_business_id
      WHERE a.id = asset_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.assets a JOIN public.businesses b ON b.id = a.owner_business_id
      WHERE a.id = asset_id AND b.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 5) asset_utilization (rolling snapshot per period)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_utilization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  days_rented INTEGER NOT NULL DEFAULT 0,
  days_idle INTEGER NOT NULL DEFAULT 0,
  days_maintenance INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  utilization_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_autil_asset ON public.asset_utilization(asset_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_utilization TO authenticated;
GRANT ALL ON public.asset_utilization TO service_role;
ALTER TABLE public.asset_utilization ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autil owner access" ON public.asset_utilization FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.assets a JOIN public.businesses b ON b.id = a.owner_business_id
      WHERE a.id = asset_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.assets a JOIN public.businesses b ON b.id = a.owner_business_id
      WHERE a.id = asset_id AND b.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 6) asset_alerts
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT ('AALR-' || nextval('public.asset_alert_seq')::text),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- e.g. maintenance_due, inspection_overdue, low_utilization
  severity TEXT NOT NULL DEFAULT 'info', -- info | warning | critical
  message_ar TEXT,
  message_en TEXT,
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aalr_asset ON public.asset_alerts(asset_id);
CREATE INDEX IF NOT EXISTS idx_aalr_open ON public.asset_alerts(is_resolved) WHERE is_resolved = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_alerts TO authenticated;
GRANT ALL ON public.asset_alerts TO service_role;
ALTER TABLE public.asset_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aalr owner access" ON public.asset_alerts FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.assets a JOIN public.businesses b ON b.id = a.owner_business_id
      WHERE a.id = asset_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.assets a JOIN public.businesses b ON b.id = a.owner_business_id
      WHERE a.id = asset_id AND b.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 7) asset_rental_links (many-to-many with rental_items)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.asset_rental_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  rental_item_id UUID NOT NULL REFERENCES public.rental_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_id, rental_item_id)
);
CREATE INDEX IF NOT EXISTS idx_arl_asset ON public.asset_rental_links(asset_id);
CREATE INDEX IF NOT EXISTS idx_arl_item ON public.asset_rental_links(rental_item_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_rental_links TO authenticated;
GRANT ALL ON public.asset_rental_links TO service_role;
ALTER TABLE public.asset_rental_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "arl owner access" ON public.asset_rental_links FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.assets a JOIN public.businesses b ON b.id = a.owner_business_id
      WHERE a.id = asset_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.assets a JOIN public.businesses b ON b.id = a.owner_business_id
      WHERE a.id = asset_id AND b.user_id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- updated_at triggers
-- ------------------------------------------------------------
CREATE TRIGGER trg_asset_categories_uat BEFORE UPDATE ON public.asset_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_assets_uat BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_asset_maintenance_uat BEFORE UPDATE ON public.asset_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_asset_inspections_uat BEFORE UPDATE ON public.asset_inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_asset_utilization_uat BEFORE UPDATE ON public.asset_utilization
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Status roll: flag overdue maintenance/inspection, update asset.next_*
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assets_roll_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_maint_overdue INTEGER := 0;
  v_insp_overdue INTEGER := 0;
BEGIN
  UPDATE public.asset_maintenance
    SET status = 'overdue', updated_at = now()
    WHERE status IN ('planned') AND scheduled_for IS NOT NULL AND scheduled_for < CURRENT_DATE;
  GET DIAGNOSTICS v_maint_overdue = ROW_COUNT;

  UPDATE public.asset_inspections
    SET result = 'needs_attention', updated_at = now()
    WHERE result = 'pending' AND scheduled_for IS NOT NULL AND scheduled_for < CURRENT_DATE;
  GET DIAGNOSTICS v_insp_overdue = ROW_COUNT;

  RETURN jsonb_build_object(
    'maintenance_overdue', v_maint_overdue,
    'inspections_overdue', v_insp_overdue,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assets_roll_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assets_roll_status() TO service_role;

-- ------------------------------------------------------------
-- Ops counts RPC
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assets_ops_counts()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.assets WHERE is_active = true),
    'available', (SELECT count(*) FROM public.assets WHERE status = 'available' AND is_active = true),
    'rented', (SELECT count(*) FROM public.assets WHERE status = 'rented'),
    'maintenance', (SELECT count(*) FROM public.assets WHERE status = 'maintenance'),
    'inspection', (SELECT count(*) FROM public.assets WHERE status = 'inspection'),
    'retired', (SELECT count(*) FROM public.assets WHERE status = 'retired'),
    'maintenance_overdue', (SELECT count(*) FROM public.asset_maintenance WHERE status = 'overdue'),
    'maintenance_due_soon', (SELECT count(*) FROM public.asset_maintenance WHERE status = 'planned' AND scheduled_for BETWEEN CURRENT_DATE AND CURRENT_DATE + 7),
    'inspections_overdue', (SELECT count(*) FROM public.asset_inspections WHERE result IN ('pending','needs_attention') AND scheduled_for IS NOT NULL AND scheduled_for < CURRENT_DATE),
    'open_alerts', (SELECT count(*) FROM public.asset_alerts WHERE is_resolved = false),
    'low_utilization', (SELECT count(*) FROM public.asset_utilization u WHERE u.utilization_rate < 25 AND u.period_end >= CURRENT_DATE - INTERVAL '30 days')
  ) INTO r;
  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.assets_ops_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assets_ops_counts() TO authenticated, service_role;

-- ------------------------------------------------------------
-- Seed default categories (idempotent)
-- ------------------------------------------------------------
INSERT INTO public.asset_categories(slug, name_ar, name_en, icon, sort_order) VALUES
  ('generators','مولدات كهربائية','Generators','Zap',10),
  ('containers','حاويات','Containers','Container',20),
  ('scaffolding','سقالات','Scaffolding','Construction',30),
  ('lifts','رافعات وروافع','Lifts & Hoists','MoveVertical',40),
  ('excavators','حفارات','Excavators','Tractor',50),
  ('drills','معدات حفر وثقب','Drills','Drill',60),
  ('saws','مناشير','Saws','Scissors',70),
  ('forklifts','رافعات شوكية','Forklifts','PackagePlus',80),
  ('compressors','ضواغط هواء','Compressors','Wind',90),
  ('site-tools','أدوات موقع','Site Tools','Wrench',100)
ON CONFLICT (slug) DO NOTHING;
