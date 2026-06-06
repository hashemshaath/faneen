
CREATE SEQUENCE IF NOT EXISTS public.seq_brand_product START WITH 1000000 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_brand_product_request START WITH 1000000 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS public.brand_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  brand_id uuid NOT NULL REFERENCES public.brand_catalog(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  slug text,
  model_number text,
  sku text,
  description_ar text,
  description_en text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('draft','pending','approved','rejected','archived')),
  is_verified boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  rejection_reason text,
  source text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','provider_request','import')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_products_brand_idx ON public.brand_products(brand_id);
CREATE INDEX IF NOT EXISTS brand_products_status_idx ON public.brand_products(status);
CREATE INDEX IF NOT EXISTS brand_products_public_idx ON public.brand_products(brand_id) WHERE status='approved';
CREATE INDEX IF NOT EXISTS brand_products_category_idx ON public.brand_products(category_id);
CREATE UNIQUE INDEX IF NOT EXISTS brand_products_unique_name_en ON public.brand_products(brand_id, lower(name_en)) WHERE name_en IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS brand_products_unique_name_ar ON public.brand_products(brand_id, lower(name_ar));

GRANT SELECT ON public.brand_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.brand_products TO authenticated;
GRANT ALL ON public.brand_products TO service_role;

ALTER TABLE public.brand_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved brand products are public"
  ON public.brand_products FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins read all brand products"
  ON public.brand_products FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage brand products"
  ON public.brand_products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.brand_product_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  brand_id uuid NOT NULL REFERENCES public.brand_catalog(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  model_number text,
  description_ar text,
  description_en text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  specs jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','approved','rejected','needs_more_info')),
  admin_notes text,
  reject_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_product_id uuid REFERENCES public.brand_products(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bpr_brand_idx ON public.brand_product_requests(brand_id);
CREATE INDEX IF NOT EXISTS bpr_business_idx ON public.brand_product_requests(business_id);
CREATE INDEX IF NOT EXISTS bpr_status_idx ON public.brand_product_requests(status);
CREATE INDEX IF NOT EXISTS bpr_user_idx ON public.brand_product_requests(requested_by);

GRANT SELECT, INSERT, UPDATE ON public.brand_product_requests TO authenticated;
GRANT ALL ON public.brand_product_requests TO service_role;

ALTER TABLE public.brand_product_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view own product requests"
  ON public.brand_product_requests FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners create own product requests"
  ON public.brand_product_requests FOR INSERT
  TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Owners or admin edit product requests"
  ON public.brand_product_requests FOR UPDATE
  TO authenticated
  USING (
    (requested_by = auth.uid() AND status IN ('pending','needs_more_info'))
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (requested_by = auth.uid() AND status IN ('pending','needs_more_info'))
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete product requests"
  ON public.brand_product_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_brand_product_ref_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN
    NEW.ref_id := 'BPR-' || nextval('public.seq_brand_product')::text;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.set_brand_product_request_ref_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL THEN
    NEW.ref_id := 'BPQ-' || nextval('public.seq_brand_product_request')::text;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_set_brand_product_ref_id ON public.brand_products;
CREATE TRIGGER trg_set_brand_product_ref_id BEFORE INSERT ON public.brand_products
  FOR EACH ROW EXECUTE FUNCTION public.set_brand_product_ref_id();

DROP TRIGGER IF EXISTS trg_set_brand_product_request_ref_id ON public.brand_product_requests;
CREATE TRIGGER trg_set_brand_product_request_ref_id BEFORE INSERT ON public.brand_product_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_brand_product_request_ref_id();

DROP TRIGGER IF EXISTS trg_brand_products_updated ON public.brand_products;
CREATE TRIGGER trg_brand_products_updated BEFORE UPDATE ON public.brand_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bpr_updated ON public.brand_product_requests;
CREATE TRIGGER trg_bpr_updated BEFORE UPDATE ON public.brand_product_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.admin_approve_brand_product_request(_req_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.brand_product_requests%ROWTYPE;
  new_product_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  SELECT * INTO r FROM public.brand_product_requests WHERE id = _req_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF r.status = 'approved' THEN RAISE EXCEPTION 'already approved'; END IF;

  INSERT INTO public.brand_products (
    brand_id, name_ar, name_en, model_number, description_ar, description_en,
    category_id, image_url, gallery, specs, status, source,
    created_by, approved_by, approved_at
  ) VALUES (
    r.brand_id, r.name_ar, r.name_en, r.model_number, r.description_ar, r.description_en,
    r.category_id, r.image_url, r.gallery, r.specs, 'approved', 'provider_request',
    r.requested_by, auth.uid(), now()
  ) RETURNING id INTO new_product_id;

  UPDATE public.brand_product_requests
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
         approved_product_id = new_product_id
   WHERE id = _req_id;

  RETURN new_product_id;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_reject_brand_product_request(_req_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  UPDATE public.brand_product_requests
     SET status = 'rejected', reject_reason = _reason,
         reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _req_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_approve_brand_product_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_brand_product_request(uuid, text) TO authenticated;
