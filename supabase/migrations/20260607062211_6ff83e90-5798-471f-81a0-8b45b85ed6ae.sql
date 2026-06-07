-- =========================================================================
-- Phase 3.1 — business_taxonomy_categories link table
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.business_taxonomy_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.taxonomy_categories(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN (
    'entity_type','primary_activity','secondary_activity',
    'service','product_category','material_type','custom'
  )),
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, category_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_taxonomy_categories TO authenticated;
GRANT ALL ON public.business_taxonomy_categories TO service_role;

ALTER TABLE public.business_taxonomy_categories ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_btc_business ON public.business_taxonomy_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_btc_category ON public.business_taxonomy_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_btc_role ON public.business_taxonomy_categories(role);
CREATE INDEX IF NOT EXISTS idx_btc_primary ON public.business_taxonomy_categories(is_primary) WHERE is_primary;

CREATE OR REPLACE FUNCTION public.btc_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_btc_updated_at ON public.business_taxonomy_categories;
CREATE TRIGGER trg_btc_updated_at
  BEFORE UPDATE ON public.business_taxonomy_categories
  FOR EACH ROW EXECUTE FUNCTION public.btc_updated_at();

DROP POLICY IF EXISTS "btc admins manage all" ON public.business_taxonomy_categories;
CREATE POLICY "btc admins manage all" ON public.business_taxonomy_categories
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

DROP POLICY IF EXISTS "btc owner select" ON public.business_taxonomy_categories;
CREATE POLICY "btc owner select" ON public.business_taxonomy_categories
  FOR SELECT TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

DROP POLICY IF EXISTS "btc owner insert" ON public.business_taxonomy_categories;
CREATE POLICY "btc owner insert" ON public.business_taxonomy_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

DROP POLICY IF EXISTS "btc owner update" ON public.business_taxonomy_categories;
CREATE POLICY "btc owner update" ON public.business_taxonomy_categories
  FOR UPDATE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id))
  WITH CHECK (public.is_business_owner(auth.uid(), business_id));

DROP POLICY IF EXISTS "btc owner delete" ON public.business_taxonomy_categories;
CREATE POLICY "btc owner delete" ON public.business_taxonomy_categories
  FOR DELETE TO authenticated
  USING (public.is_business_owner(auth.uid(), business_id));

-- =========================================================================
-- Phase 3.2 — RPC
-- =========================================================================
CREATE OR REPLACE FUNCTION public.set_business_taxonomy_categories(
  p_business_id uuid,
  p_entity_type_category_id uuid,
  p_primary_activity_category_id uuid,
  p_secondary_activity_category_ids uuid[]
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := public.has_admin_access(v_uid);
  v_is_owner boolean := public.is_business_owner(v_uid, p_business_id);
  v_entity_type_id uuid;
  v_primary_id uuid;
  v_secondary_id uuid;
  v_primary_has_children boolean := false;
  v_cat_type text;
  v_sec_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  IF NOT (v_is_admin OR v_is_owner) THEN RAISE EXCEPTION 'NOT_AUTHORIZED'; END IF;

  SELECT id INTO v_entity_type_id FROM public.taxonomy_types WHERE code = 'entity_type';
  SELECT id INTO v_primary_id     FROM public.taxonomy_types WHERE code = 'primary_activity';
  SELECT id INTO v_secondary_id   FROM public.taxonomy_types WHERE code = 'secondary_activity';

  IF p_entity_type_category_id IS NOT NULL THEN
    PERFORM 1 FROM public.taxonomy_categories
      WHERE id = p_entity_type_category_id
        AND taxonomy_type_id = v_entity_type_id
        AND is_active AND is_public AND NOT is_archived
        AND show_in_registration;
    IF NOT FOUND THEN RAISE EXCEPTION 'INVALID_ENTITY_TYPE'; END IF;
  END IF;

  IF p_primary_activity_category_id IS NOT NULL THEN
    SELECT tt.code INTO v_cat_type
      FROM public.taxonomy_categories tc
      JOIN public.taxonomy_types tt ON tt.id = tc.taxonomy_type_id
      WHERE tc.id = p_primary_activity_category_id
        AND tc.is_active AND tc.is_public AND NOT tc.is_archived
        AND tc.show_in_registration;
    IF NOT FOUND OR v_cat_type NOT IN ('primary_activity','sector') THEN
      RAISE EXCEPTION 'INVALID_PRIMARY_ACTIVITY';
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.taxonomy_categories
       WHERE parent_id = p_primary_activity_category_id
         AND is_active AND NOT is_archived
    ) INTO v_primary_has_children;
  END IF;

  IF p_secondary_activity_category_ids IS NOT NULL THEN
    FOREACH v_sec_id IN ARRAY p_secondary_activity_category_ids LOOP
      SELECT tt.code INTO v_cat_type
        FROM public.taxonomy_categories tc
        JOIN public.taxonomy_types tt ON tt.id = tc.taxonomy_type_id
        WHERE tc.id = v_sec_id
          AND tc.is_active AND tc.is_public AND NOT tc.is_archived
          AND tc.show_in_registration;
      IF NOT FOUND OR v_cat_type NOT IN ('secondary_activity','primary_activity','sector','service') THEN
        RAISE EXCEPTION 'INVALID_SECONDARY_ACTIVITY';
      END IF;
      IF v_primary_has_children AND p_primary_activity_category_id IS NOT NULL THEN
        PERFORM 1 FROM public.taxonomy_categories
          WHERE id = v_sec_id AND parent_id = p_primary_activity_category_id;
        IF NOT FOUND THEN RAISE EXCEPTION 'SECONDARY_NOT_CHILD_OF_PRIMARY'; END IF;
      END IF;
    END LOOP;
  END IF;

  DELETE FROM public.business_taxonomy_categories
   WHERE business_id = p_business_id
     AND role IN ('entity_type','primary_activity','secondary_activity');

  IF p_entity_type_category_id IS NOT NULL THEN
    INSERT INTO public.business_taxonomy_categories(business_id, category_id, role, is_primary)
      VALUES (p_business_id, p_entity_type_category_id, 'entity_type', true);
  END IF;
  IF p_primary_activity_category_id IS NOT NULL THEN
    INSERT INTO public.business_taxonomy_categories(business_id, category_id, role, is_primary)
      VALUES (p_business_id, p_primary_activity_category_id, 'primary_activity', true);
  END IF;
  IF p_secondary_activity_category_ids IS NOT NULL THEN
    FOREACH v_sec_id IN ARRAY p_secondary_activity_category_ids LOOP
      INSERT INTO public.business_taxonomy_categories(business_id, category_id, role, is_primary)
        VALUES (p_business_id, v_sec_id, 'secondary_activity', false)
        ON CONFLICT (business_id, category_id, role) DO NOTHING;
    END LOOP;
  END IF;

  RETURN jsonb_build_object('success', true, 'business_id', p_business_id);
END;
$$;

REVOKE ALL ON FUNCTION public.set_business_taxonomy_categories(uuid,uuid,uuid,uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_business_taxonomy_categories(uuid,uuid,uuid,uuid[]) TO authenticated;

-- =========================================================================
-- Phase 3.3 — Seed secondary_activity categories
-- =========================================================================
WITH t AS (SELECT id FROM public.taxonomy_types WHERE code = 'secondary_activity'),
parents AS (
  SELECT id, slug FROM public.taxonomy_categories
   WHERE slug IN ('aluminum-glass-facades','steel-metal-works','wood-carpentry',
     'stainless-steel-fabrication','contracting-finishing','construction-building')
),
seed(parent_slug, slug, name_ar, sort) AS (VALUES
  ('aluminum-glass-facades','alum-doors','أبواب ألمنيوم',1),
  ('aluminum-glass-facades','alum-windows','شبابيك ألمنيوم',2),
  ('aluminum-glass-facades','alum-facades','واجهات ألمنيوم',3),
  ('aluminum-glass-facades','alum-kitchens','مطابخ ألمنيوم',4),
  ('aluminum-glass-facades','alum-partitions','قواطع ألمنيوم',5),
  ('aluminum-glass-facades','tempered-glass','زجاج سيكوريت',6),
  ('aluminum-glass-facades','glass-facades','واجهات زجاجية',7),
  ('aluminum-glass-facades','glass-doors','أبواب زجاجية',8),
  ('aluminum-glass-facades','glass-partitions','قواطع زجاجية',9),
  ('aluminum-glass-facades','cladding','كلادينج',10),
  ('aluminum-glass-facades','curtain-wall','كيرتن وول',11),
  ('aluminum-glass-facades','alum-glass-install-maintenance','تركيب وصيانة ألمنيوم وزجاج',12),
  ('aluminum-glass-facades','alum-glass-other','أعمال أخرى غير مصنفة',99),
  ('steel-metal-works','steel-doors','أبواب حديد',1),
  ('steel-metal-works','steel-windows','شبابيك حديد',2),
  ('steel-metal-works','steel-railings','درابزين',3),
  ('steel-metal-works','steel-stairs','سلالم معدنية',4),
  ('steel-metal-works','steel-mesh-protection','شبك وحمايات',5),
  ('steel-metal-works','steel-awnings','مظلات',6),
  ('steel-metal-works','steel-hangars','هناجر',7),
  ('steel-metal-works','steel-structures','هياكل معدنية',8),
  ('steel-metal-works','welding-works','أعمال لحام',9),
  ('steel-metal-works','metal-cut-bend','قص وثني معادن',10),
  ('steel-metal-works','custom-metal-fab','تصنيع معدني حسب الطلب',11),
  ('steel-metal-works','steel-other','أعمال أخرى غير مصنفة',99),
  ('wood-carpentry','wood-doors','أبواب خشب',1),
  ('wood-carpentry','wood-wardrobes','خزائن',2),
  ('wood-carpentry','wood-custom-furniture','تفصيل أثاث',3),
  ('wood-carpentry','wood-office-fitout','مكاتب وتجهيزات',4),
  ('wood-carpentry','wood-decor','ديكورات خشبية',5),
  ('wood-carpentry','wood-partitions','قواطع داخلية',6),
  ('wood-carpentry','wood-kitchens','مطابخ خشب',7),
  ('wood-carpentry','wood-mdf','أعمال MDF',8),
  ('wood-carpentry','wood-natural','أعمال خشب طبيعي',9),
  ('wood-carpentry','wood-maintenance','أعمال صيانة وتعديل',10),
  ('wood-carpentry','wood-other','أعمال أخرى غير مصنفة',99),
  ('stainless-steel-fabrication','ss-restaurant-equipment','تجهيزات مطاعم',1),
  ('stainless-steel-fabrication','ss-commercial-kitchens','مطابخ تجارية',2),
  ('stainless-steel-fabrication','ss-tables','طاولات ستانلس',3),
  ('stainless-steel-fabrication','ss-sinks','أحواض ومغاسل',4),
  ('stainless-steel-fabrication','ss-railings','درابزين ستانلس',5),
  ('stainless-steel-fabrication','ss-carts-equipment','عربات وتجهيزات خاصة',6),
  ('stainless-steel-fabrication','ss-custom','تفصيل ستانلس حسب الطلب',7),
  ('stainless-steel-fabrication','ss-maintenance','صيانة وتعديل ستانلس',8),
  ('stainless-steel-fabrication','ss-other','أعمال أخرى غير مصنفة',99),
  ('contracting-finishing','finishing-interior','تشطيب داخلي',1),
  ('contracting-finishing','finishing-exterior','تشطيب خارجي',2),
  ('contracting-finishing','paint-works','دهانات',3),
  ('contracting-finishing','gypsum-board','جبس بورد',4),
  ('contracting-finishing','flooring','أرضيات',5),
  ('contracting-finishing','tiles-ceramic','بلاط وسيراميك',6),
  ('contracting-finishing','insulation','عزل',7),
  ('contracting-finishing','shop-fitout','تجهيز محلات',8),
  ('contracting-finishing','office-fitout','تجهيز مكاتب',9),
  ('contracting-finishing','restaurants-fitout','تجهيز مطاعم وكافيهات',10),
  ('contracting-finishing','turnkey','تسليم مفتاح',11),
  ('contracting-finishing','finishing-other','أعمال أخرى غير مصنفة',99),
  ('construction-building','concrete-works','أعمال خرسانة',1),
  ('construction-building','structural-works','أعمال عظم',2),
  ('construction-building','excavation','أعمال حفر وردم',3),
  ('construction-building','foundations','أعمال أساسات',4),
  ('construction-building','roads-works','أعمال طرق',5),
  ('construction-building','water-networks','أعمال شبكات مياه',6),
  ('construction-building','sewage-works','أعمال صرف صحي',7),
  ('construction-building','electrical-works','أعمال كهرباء',8),
  ('construction-building','hvac-works','أعمال تكييف وتبريد',9),
  ('construction-building','landscape-irrigation','أعمال لاندسكيب وري',10),
  ('construction-building','demolition','هدم وترحيل مخلفات',11),
  ('construction-building','construction-other','أعمال أخرى غير مصنفة',99)
)
INSERT INTO public.taxonomy_categories (
  taxonomy_type_id, parent_id, slug, name_ar, name_en,
  short_description_ar, sort_order,
  is_active, is_public, is_searchable, is_archived,
  show_in_registration, show_in_search, show_in_seo
)
SELECT t.id, p.id, s.slug, s.name_ar, NULL, s.name_ar, s.sort,
       true, true, true, false, true, true, false
FROM seed s
JOIN parents p ON p.slug = s.parent_slug
CROSS JOIN t
ON CONFLICT (slug) DO NOTHING;
