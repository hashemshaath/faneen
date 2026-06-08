
CREATE SEQUENCE IF NOT EXISTS public.seq_rcat START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_rent START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_rord START 1000000;
CREATE SEQUENCE IF NOT EXISTS public.seq_rext START 1000000;

DO $$ BEGIN CREATE TYPE public.rental_unit AS ENUM ('day','hour','piece','m','m2','unit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rental_item_status AS ENUM ('draft','pending_review','approved','rejected','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rental_order_status AS ENUM ('draft','active','expiring_soon','expired','extended','renewed','closed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rental_extension_type AS ENUM ('full','partial','duration_only','quantity_only'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.rental_extension_status AS ENUM ('pending','approved','rejected','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.rental_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT public.generate_ref_id('RCAT','seq_rcat'),
  slug TEXT UNIQUE NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  icon TEXT,
  seo_keywords TEXT[],
  default_image_url TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rental_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rental_categories TO authenticated;
GRANT ALL ON public.rental_categories TO service_role;
ALTER TABLE public.rental_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_categories public read" ON public.rental_categories FOR SELECT USING (is_active = true);
CREATE POLICY "rental_categories admin manage" ON public.rental_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.rental_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT public.generate_ref_id('RENT','seq_rent'),
  category_id UUID NOT NULL REFERENCES public.rental_categories(id) ON DELETE RESTRICT,
  provider_business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  unit public.rental_unit NOT NULL DEFAULT 'day',
  base_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  min_duration INT NOT NULL DEFAULT 1,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  usage_terms TEXT,
  late_terms TEXT,
  penalty_terms TEXT,
  status public.rental_item_status NOT NULL DEFAULT 'draft',
  city_id UUID REFERENCES public.cities(id) ON DELETE SET NULL,
  service_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability_status TEXT NOT NULL DEFAULT 'available',
  is_published BOOLEAN NOT NULL DEFAULT false,
  seo_slug TEXT UNIQUE,
  view_count INT NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_items_provider ON public.rental_items(provider_business_id);
CREATE INDEX idx_rental_items_category ON public.rental_items(category_id);
CREATE INDEX idx_rental_items_pub ON public.rental_items(is_published, status) WHERE is_published = true AND status = 'approved';
GRANT SELECT ON public.rental_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rental_items TO authenticated;
GRANT ALL ON public.rental_items TO service_role;
ALTER TABLE public.rental_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_items public read approved" ON public.rental_items FOR SELECT USING (is_published = true AND status = 'approved');
CREATE POLICY "rental_items provider read own" ON public.rental_items FOR SELECT TO authenticated
  USING (provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rental_items provider insert own" ON public.rental_items FOR INSERT TO authenticated
  WITH CHECK (provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rental_items provider update own" ON public.rental_items FOR UPDATE TO authenticated
  USING (provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rental_items provider delete own" ON public.rental_items FOR DELETE TO authenticated
  USING (provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid()) OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.rental_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT public.generate_ref_id('RORD','seq_rord'),
  provider_business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE RESTRICT,
  customer_user_id UUID,
  customer_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  project_id UUID,
  work_order_id UUID,
  client_site_id UUID,
  rental_item_id UUID NOT NULL REFERENCES public.rental_items(id) ON DELETE RESTRICT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  status public.rental_order_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  terms_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_orders_provider ON public.rental_orders(provider_business_id);
CREATE INDEX idx_rental_orders_customer ON public.rental_orders(customer_user_id);
CREATE INDEX idx_rental_orders_status ON public.rental_orders(status);
CREATE INDEX idx_rental_orders_end_date ON public.rental_orders(end_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_orders TO authenticated;
GRANT ALL ON public.rental_orders TO service_role;
ALTER TABLE public.rental_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_orders scoped read" ON public.rental_orders FOR SELECT TO authenticated
  USING (provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
         OR customer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rental_orders insert" ON public.rental_orders FOR INSERT TO authenticated
  WITH CHECK (customer_user_id = auth.uid()
              OR provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
              OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rental_orders update" ON public.rental_orders FOR UPDATE TO authenticated
  USING (provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
         OR customer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rental_orders delete admin" ON public.rental_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.rental_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id TEXT UNIQUE NOT NULL DEFAULT public.generate_ref_id('REXT','seq_rext'),
  rental_order_id UUID NOT NULL REFERENCES public.rental_orders(id) ON DELETE CASCADE,
  extension_type public.rental_extension_type NOT NULL,
  additional_days INT NOT NULL DEFAULT 0,
  additional_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
  reason TEXT,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  approved_by_provider BOOLEAN NOT NULL DEFAULT false,
  approved_by_customer BOOLEAN NOT NULL DEFAULT false,
  status public.rental_extension_status NOT NULL DEFAULT 'pending',
  effective_from DATE,
  created_by UUID NOT NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_extensions_order ON public.rental_extensions(rental_order_id);
CREATE INDEX idx_rental_extensions_status ON public.rental_extensions(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_extensions TO authenticated;
GRANT ALL ON public.rental_extensions TO service_role;
ALTER TABLE public.rental_extensions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_extensions scoped read" ON public.rental_extensions FOR SELECT TO authenticated
  USING (rental_order_id IN (SELECT id FROM public.rental_orders
            WHERE provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
               OR customer_user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rental_extensions scoped write" ON public.rental_extensions FOR ALL TO authenticated
  USING (rental_order_id IN (SELECT id FROM public.rental_orders
            WHERE provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
               OR customer_user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (rental_order_id IN (SELECT id FROM public.rental_orders
            WHERE provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
               OR customer_user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'));

CREATE TABLE public.rental_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_order_id UUID NOT NULL REFERENCES public.rental_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rental_order_events_order ON public.rental_order_events(rental_order_id);
CREATE INDEX idx_rental_order_events_type ON public.rental_order_events(event_type);
GRANT SELECT, INSERT ON public.rental_order_events TO authenticated;
GRANT ALL ON public.rental_order_events TO service_role;
ALTER TABLE public.rental_order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rental_order_events scoped read" ON public.rental_order_events FOR SELECT TO authenticated
  USING (rental_order_id IN (SELECT id FROM public.rental_orders
            WHERE provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
               OR customer_user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "rental_order_events scoped insert" ON public.rental_order_events FOR INSERT TO authenticated
  WITH CHECK (rental_order_id IN (SELECT id FROM public.rental_orders
            WHERE provider_business_id IN (SELECT id FROM public.businesses WHERE user_id = auth.uid())
               OR customer_user_id = auth.uid())
         OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_rental_categories_updated BEFORE UPDATE ON public.rental_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rental_items_updated BEFORE UPDATE ON public.rental_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rental_orders_updated BEFORE UPDATE ON public.rental_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_rental_extensions_updated BEFORE UPDATE ON public.rental_extensions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.rental_orders_derive()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.end_date IS NOT NULL AND NEW.start_date IS NOT NULL THEN
    NEW.total_days := GREATEST(1, (NEW.end_date - NEW.start_date) + 1);
  END IF;
  IF NEW.unit_price > 0 AND NEW.total_days > 0 AND NEW.quantity > 0 AND NEW.total_amount = 0 THEN
    NEW.total_amount := NEW.unit_price * NEW.total_days * NEW.quantity;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_rental_orders_derive BEFORE INSERT OR UPDATE ON public.rental_orders FOR EACH ROW EXECUTE FUNCTION public.rental_orders_derive();

CREATE OR REPLACE FUNCTION public.rental_orders_roll_status()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT := 0;
BEGIN
  UPDATE public.rental_orders SET status = 'expiring_soon'
    WHERE status = 'active' AND end_date <= (CURRENT_DATE + INTERVAL '7 days')::date AND end_date >= CURRENT_DATE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.rental_orders SET status = 'expired'
    WHERE status IN ('active','expiring_soon') AND end_date < CURRENT_DATE;
  RETURN v_count;
END; $$;
GRANT EXECUTE ON FUNCTION public.rental_orders_roll_status() TO authenticated, service_role;

INSERT INTO public.rental_categories (slug, name_ar, name_en, description_ar, description_en, icon, sort_order, seo_keywords) VALUES
  ('scaffolding','سقالات','Scaffolding','تأجير سقالات لمشاريع البناء والتشييد','Scaffolding rental for construction projects','layers',10,ARRAY['تأجير سقالات','scaffolding rental']),
  ('containers','حاويات','Containers','تأجير حاويات للمواقع والمخلفات','Site containers and waste containers rental','box',20,ARRAY['تأجير حاويات','container rental']),
  ('generators','مولدات','Generators','تأجير مولدات كهربائية بكافة القدرات','Power generators rental — all capacities','zap',30,ARRAY['تأجير مولدات','generator rental']),
  ('electrical','معدات كهربائية','Electrical Equipment','تأجير معدات كهربائية للمواقع','Electrical site equipment rental','plug',40,ARRAY['معدات كهربائية تأجير']),
  ('cutting','معدات قص','Cutting Equipment','تأجير معدات قص ومناشير','Cutting equipment and saws rental','scissors',50,ARRAY['تأجير معدات قص']),
  ('drilling','معدات حفر','Drilling Equipment','تأجير معدات حفر ودريل','Drilling equipment rental','drill',60,ARRAY['تأجير دريل','drilling rental']),
  ('woodworking','أدوات نجارة','Woodworking Tools','تأجير أدوات نجارة','Woodworking tools rental','hammer',70,ARRAY['تأجير أدوات نجارة']),
  ('metalworking','أدوات حدادة','Metalworking Tools','تأجير أدوات حدادة','Metalworking tools rental','wrench',80,ARRAY['تأجير أدوات حدادة']),
  ('safety','معدات سلامة','Safety Equipment','تأجير معدات سلامة','Safety equipment rental','shield',90,ARRAY['تأجير معدات سلامة']),
  ('lifting','معدات رفع ونقل','Lifting & Transport','تأجير معدات رفع ونقل','Lifting and transport equipment rental','truck',100,ARRAY['معدات رفع']),
  ('finishing','معدات تشطيب','Finishing Equipment','تأجير معدات تشطيب','Finishing equipment rental','paintbrush',110,ARRAY['معدات تشطيب']),
  ('site-support','خدمات موقع مساندة','Site Support Services','خدمات مساندة لمواقع البناء','Construction site support services','life-buoy',120,ARRAY['خدمات موقع']);
