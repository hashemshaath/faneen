-- 1. Brand catalog
CREATE SEQUENCE IF NOT EXISTS public.seq_brand START 1000;
CREATE SEQUENCE IF NOT EXISTS public.seq_brand_request START 1000;

CREATE TABLE IF NOT EXISTS public.brand_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  slug text UNIQUE,
  logo_url text,
  website text,
  sector_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.brand_catalog TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_catalog TO authenticated;
GRANT ALL ON public.brand_catalog TO service_role;

ALTER TABLE public.brand_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_catalog_select_public" ON public.brand_catalog;
CREATE POLICY "brand_catalog_select_public" ON public.brand_catalog FOR SELECT USING (true);

DROP POLICY IF EXISTS "brand_catalog_admin_write" ON public.brand_catalog;
CREATE POLICY "brand_catalog_admin_write" ON public.brand_catalog
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_brand_ref_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    NEW.ref_id := 'BRN-' || lpad(nextval('public.seq_brand')::text, 7, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brand_ref_id ON public.brand_catalog;
CREATE TRIGGER trg_brand_ref_id BEFORE INSERT ON public.brand_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_brand_ref_id();

DROP TRIGGER IF EXISTS trg_brand_updated_at ON public.brand_catalog;
CREATE TRIGGER trg_brand_updated_at BEFORE UPDATE ON public.brand_catalog
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_brand_catalog_sector ON public.brand_catalog(sector_id);
CREATE INDEX IF NOT EXISTS idx_brand_catalog_active ON public.brand_catalog(is_active);

-- 2. Link table
CREATE TABLE IF NOT EXISTS public.business_service_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_service_id uuid NOT NULL REFERENCES public.business_services(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.brand_catalog(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_service_id, brand_id)
);

GRANT SELECT ON public.business_service_brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_service_brands TO authenticated;
GRANT ALL ON public.business_service_brands TO service_role;

ALTER TABLE public.business_service_brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bsb_select_public" ON public.business_service_brands;
CREATE POLICY "bsb_select_public" ON public.business_service_brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "bsb_owner_write" ON public.business_service_brands;
CREATE POLICY "bsb_owner_write" ON public.business_service_brands
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()) OR public.has_admin_access(auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()) OR public.has_admin_access(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_bsb_service ON public.business_service_brands(business_service_id);
CREATE INDEX IF NOT EXISTS idx_bsb_business ON public.business_service_brands(business_id);
CREATE INDEX IF NOT EXISTS idx_bsb_brand ON public.business_service_brands(brand_id);

-- 3. Brand addition requests
CREATE TABLE IF NOT EXISTS public.brand_addition_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id text UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  business_service_id uuid REFERENCES public.business_services(id) ON DELETE SET NULL,
  sector_id text,
  name_ar text NOT NULL,
  name_en text,
  website text,
  logo_url text,
  description text,
  status public.service_request_status NOT NULL DEFAULT 'pending',
  reject_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  ticket_ref_id text,
  approved_brand_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.brand_addition_requests TO authenticated;
GRANT ALL ON public.brand_addition_requests TO service_role;

ALTER TABLE public.brand_addition_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brr_insert_owner" ON public.brand_addition_requests;
CREATE POLICY "brr_insert_owner" ON public.brand_addition_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

DROP POLICY IF EXISTS "brr_select_own_or_admin" ON public.brand_addition_requests;
CREATE POLICY "brr_select_own_or_admin" ON public.brand_addition_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "brr_update_admin" ON public.brand_addition_requests;
CREATE POLICY "brr_update_admin" ON public.brand_addition_requests
  FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_brand_request_ref_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.ref_id IS NULL OR NEW.ref_id = '' THEN
    NEW.ref_id := 'BRR-' || lpad(nextval('public.seq_brand_request')::text, 7, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brr_ref_id ON public.brand_addition_requests;
CREATE TRIGGER trg_brr_ref_id BEFORE INSERT ON public.brand_addition_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_brand_request_ref_id();

DROP TRIGGER IF EXISTS trg_brr_updated_at ON public.brand_addition_requests;
CREATE TRIGGER trg_brr_updated_at BEFORE UPDATE ON public.brand_addition_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_brr_business ON public.brand_addition_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_brr_status ON public.brand_addition_requests(status);
CREATE INDEX IF NOT EXISTS idx_brr_user ON public.brand_addition_requests(user_id);

-- 4. Approve / reject brand
CREATE OR REPLACE FUNCTION public.approve_brand_addition_request(p_request_id uuid, p_admin_note text DEFAULT NULL)
RETURNS public.brand_addition_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.brand_addition_requests; v_brand_id uuid; v_slug text;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_req FROM public.brand_addition_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request already %', v_req.status; END IF;

  v_slug := lower(regexp_replace(coalesce(v_req.name_en, v_req.name_ar), '[^a-zA-Z0-9]+', '-', 'g'))
            || '-' || substring(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO public.brand_catalog(name_ar, name_en, slug, logo_url, website, sector_id, is_active, created_by)
  VALUES (v_req.name_ar, v_req.name_en, v_slug, v_req.logo_url, v_req.website, v_req.sector_id, true, auth.uid())
  RETURNING id INTO v_brand_id;

  IF v_req.business_service_id IS NOT NULL THEN
    INSERT INTO public.business_service_brands(business_service_id, business_id, brand_id)
    VALUES (v_req.business_service_id, v_req.business_id, v_brand_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_req.ticket_ref_id IS NOT NULL THEN
    UPDATE public.help_feature_requests SET status = 'completed', updated_at = now()
     WHERE ref_id = v_req.ticket_ref_id AND status::text <> 'completed';
  END IF;

  UPDATE public.brand_addition_requests
     SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(),
         approved_brand_id = v_brand_id, reject_reason = NULLIF(p_admin_note, '')
   WHERE id = p_request_id RETURNING * INTO v_req;
  RETURN v_req;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_brand_addition_request(p_request_id uuid, p_reason text)
RETURNS public.brand_addition_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_req public.brand_addition_requests;
BEGIN
  IF NOT public.has_admin_access(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN RAISE EXCEPTION 'rejection reason is required'; END IF;
  SELECT * INTO v_req FROM public.brand_addition_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'request already %', v_req.status; END IF;

  IF v_req.ticket_ref_id IS NOT NULL THEN
    UPDATE public.help_feature_requests SET status = 'declined', updated_at = now()
     WHERE ref_id = v_req.ticket_ref_id AND status::text <> 'declined';
  END IF;

  UPDATE public.brand_addition_requests
     SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), reject_reason = p_reason
   WHERE id = p_request_id RETURNING * INTO v_req;
  RETURN v_req;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_brand_addition_request(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_brand_addition_request(uuid, text) TO authenticated;

-- 5. Bidirectional sync RPCs (provider-owned, atomic)
CREATE OR REPLACE FUNCTION public.add_business_sub_service(p_business_id uuid, p_sub_service_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.businesses WHERE id = p_business_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.has_admin_access(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_sub_service_id IS NULL OR length(trim(p_sub_service_id)) = 0 THEN RAISE EXCEPTION 'sub_service_id required'; END IF;

  UPDATE public.businesses
     SET sub_services = (
       SELECT array_agg(DISTINCT x) FROM unnest(array_append(coalesce(sub_services, '{}'), p_sub_service_id)) AS t(x)
     )
   WHERE id = p_business_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_business_sub_service(p_business_id uuid, p_sub_service_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.businesses WHERE id = p_business_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'business not found'; END IF;
  IF v_owner <> auth.uid() AND NOT public.has_admin_access(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;

  UPDATE public.businesses
     SET sub_services = array_remove(coalesce(sub_services, '{}'), p_sub_service_id)
   WHERE id = p_business_id;

  DELETE FROM public.business_services
   WHERE business_id = p_business_id AND source_sub_service_id = p_sub_service_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_business_sub_service(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_business_sub_service(uuid, text) TO authenticated;