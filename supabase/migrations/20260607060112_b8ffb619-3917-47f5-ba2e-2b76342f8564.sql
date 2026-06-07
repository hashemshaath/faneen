
-- =====================================================================
-- Phase 1: Taxonomy & Reference Data Center — schema, RLS, and seed
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.taxonomy_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  description_en text,
  is_hierarchical boolean NOT NULL DEFAULT true,
  allows_children boolean NOT NULL DEFAULT true,
  allows_multiple_selection boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.taxonomy_types TO anon, authenticated;
GRANT ALL ON public.taxonomy_types TO service_role;

ALTER TABLE public.taxonomy_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxonomy_types public read active" ON public.taxonomy_types
  FOR SELECT USING (is_active = true);
CREATE POLICY "taxonomy_types admin read all" ON public.taxonomy_types
  FOR SELECT TO authenticated USING (public.has_admin_access(auth.uid()));
CREATE POLICY "taxonomy_types admin write" ON public.taxonomy_types
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE TABLE IF NOT EXISTS public.taxonomy_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  taxonomy_type_id uuid NOT NULL REFERENCES public.taxonomy_types(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.taxonomy_categories(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  description_en text,
  short_description_ar text,
  short_description_en text,
  seo_title_ar text,
  seo_title_en text,
  seo_description_ar text,
  seo_description_en text,
  keywords_ar text[] NOT NULL DEFAULT '{}',
  keywords_en text[] NOT NULL DEFAULT '{}',
  icon text,
  color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  is_searchable boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  show_in_registration boolean NOT NULL DEFAULT false,
  show_in_search boolean NOT NULL DEFAULT true,
  show_in_seo boolean NOT NULL DEFAULT false,
  show_in_showcase boolean NOT NULL DEFAULT false,
  show_in_products boolean NOT NULL DEFAULT false,
  show_in_contracts boolean NOT NULL DEFAULT false,
  show_in_quotes boolean NOT NULL DEFAULT false,
  show_in_admin_only boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_cat_type ON public.taxonomy_categories(taxonomy_type_id);
CREATE INDEX IF NOT EXISTS idx_tax_cat_parent ON public.taxonomy_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_tax_cat_slug ON public.taxonomy_categories(slug);
CREATE INDEX IF NOT EXISTS idx_tax_cat_active ON public.taxonomy_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_tax_cat_public ON public.taxonomy_categories(is_public);
CREATE INDEX IF NOT EXISTS idx_tax_cat_searchable ON public.taxonomy_categories(is_searchable);
CREATE INDEX IF NOT EXISTS idx_tax_cat_sort ON public.taxonomy_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_tax_cat_show_reg ON public.taxonomy_categories(show_in_registration);
CREATE INDEX IF NOT EXISTS idx_tax_cat_show_search ON public.taxonomy_categories(show_in_search);
CREATE INDEX IF NOT EXISTS idx_tax_cat_show_seo ON public.taxonomy_categories(show_in_seo);

GRANT SELECT ON public.taxonomy_categories TO anon, authenticated;
GRANT ALL ON public.taxonomy_categories TO service_role;

ALTER TABLE public.taxonomy_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxonomy_categories public read" ON public.taxonomy_categories
  FOR SELECT USING (is_active = true AND is_public = true AND is_archived = false);
CREATE POLICY "taxonomy_categories admin read all" ON public.taxonomy_categories
  FOR SELECT TO authenticated USING (public.has_admin_access(auth.uid()));
CREATE POLICY "taxonomy_categories admin write" ON public.taxonomy_categories
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE TABLE IF NOT EXISTS public.taxonomy_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.taxonomy_categories(id) ON DELETE CASCADE,
  alias_ar text NOT NULL,
  alias_en text,
  normalized_alias text,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tax_alias_cat ON public.taxonomy_aliases(category_id);
CREATE INDEX IF NOT EXISTS idx_tax_alias_norm ON public.taxonomy_aliases(normalized_alias);

GRANT SELECT ON public.taxonomy_aliases TO anon, authenticated;
GRANT ALL ON public.taxonomy_aliases TO service_role;

ALTER TABLE public.taxonomy_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxonomy_aliases public read" ON public.taxonomy_aliases
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.taxonomy_categories c
    WHERE c.id = taxonomy_aliases.category_id
      AND c.is_active = true AND c.is_public = true AND c.is_archived = false
  ));
CREATE POLICY "taxonomy_aliases admin write" ON public.taxonomy_aliases
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE TABLE IF NOT EXISTS public.taxonomy_category_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.taxonomy_categories(id) ON DELETE CASCADE,
  related_category_id uuid NOT NULL REFERENCES public.taxonomy_categories(id) ON DELETE CASCADE,
  relation_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT taxonomy_relation_not_self CHECK (category_id <> related_category_id),
  CONSTRAINT taxonomy_relation_unique UNIQUE (category_id, related_category_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_tax_rel_cat ON public.taxonomy_category_relations(category_id);
CREATE INDEX IF NOT EXISTS idx_tax_rel_related ON public.taxonomy_category_relations(related_category_id);
CREATE INDEX IF NOT EXISTS idx_tax_rel_type ON public.taxonomy_category_relations(relation_type);

GRANT SELECT ON public.taxonomy_category_relations TO anon, authenticated;
GRANT ALL ON public.taxonomy_category_relations TO service_role;

ALTER TABLE public.taxonomy_category_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxonomy_relations public read" ON public.taxonomy_category_relations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.taxonomy_categories c
    WHERE c.id = taxonomy_category_relations.category_id
      AND c.is_active = true AND c.is_public = true AND c.is_archived = false
  ));
CREATE POLICY "taxonomy_relations admin write" ON public.taxonomy_category_relations
  FOR ALL TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE OR REPLACE FUNCTION public.taxonomy_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_taxonomy_types_updated_at ON public.taxonomy_types;
CREATE TRIGGER trg_taxonomy_types_updated_at
  BEFORE UPDATE ON public.taxonomy_types
  FOR EACH ROW EXECUTE FUNCTION public.taxonomy_set_updated_at();

DROP TRIGGER IF EXISTS trg_taxonomy_categories_updated_at ON public.taxonomy_categories;
CREATE TRIGGER trg_taxonomy_categories_updated_at
  BEFORE UPDATE ON public.taxonomy_categories
  FOR EACH ROW EXECUTE FUNCTION public.taxonomy_set_updated_at();

-- ============== Seed: taxonomy_types ==============
INSERT INTO public.taxonomy_types (code, name_ar, name_en, sort_order, is_hierarchical, allows_children, allows_multiple_selection) VALUES
  ('account_type','أنواع الحسابات','Account Types',10,false,false,false),
  ('entity_type','أنواع الجهات','Entity Types',20,false,false,false),
  ('sector','القطاعات','Sectors',30,true,true,true),
  ('primary_activity','الأنشطة الرئيسية','Primary Activities',40,true,true,true),
  ('secondary_activity','الأنشطة الفرعية','Secondary Activities',50,true,true,true),
  ('service','الخدمات','Services',60,true,true,true),
  ('product_category','تصنيفات المنتجات','Product Categories',70,true,true,true),
  ('product_type','أنواع المنتجات','Product Types',80,true,true,true),
  ('material_type','أنواع المواد','Material Types',90,true,true,true),
  ('contract_type','أنواع العقود','Contract Types',100,false,false,false),
  ('payment_type','أنواع الدفعات','Payment Types',110,false,false,true),
  ('project_type','أنواع المشاريع','Project Types',120,false,false,false),
  ('equipment_type','أنواع المعدات','Equipment Types',130,true,true,true),
  ('document_type','أنواع المستندات','Document Types',140,false,false,true),
  ('membership_type','أنواع العضويات','Membership Types',150,false,false,false),
  ('showcase_category','تصنيفات معرض الأعمال','Showcase Categories',160,true,true,true),
  ('seo_group','مجموعات SEO','SEO Groups',170,true,true,true),
  ('search_tag','وسوم البحث','Search Tags',180,false,false,true),
  ('system_reference','قوائم النظام المرجعية','System References',190,true,true,true),
  ('custom','تصنيفات مخصصة','Custom',999,true,true,true)
ON CONFLICT (code) DO NOTHING;

-- ============== Seed: entity_type ==============
WITH t AS (SELECT id FROM public.taxonomy_types WHERE code='entity_type')
INSERT INTO public.taxonomy_categories
  (taxonomy_type_id, slug, name_ar, name_en, sort_order, show_in_registration, show_in_search, show_in_seo)
SELECT t.id, x.slug, x.name_ar, x.name_en, x.sort_order, true, false, false
FROM t, (VALUES
  ('sole-establishment','مؤسسة فردية','Sole Establishment',10),
  ('company','شركة','Company',20),
  ('factory','مصنع','Factory',30),
  ('workshop','ورشة','Workshop',40),
  ('showroom-store','معرض / متجر','Showroom / Store',50),
  ('supplier-distributor','مورد / موزع','Supplier / Distributor',60),
  ('contractor','مقاول / شركة مقاولات','Contractor',70),
  ('engineering-consultant','مكتب هندسي / استشاري','Engineering / Consultant',80),
  ('operations-maintenance-provider','مزود تشغيل وصيانة','Operations & Maintenance',90),
  ('equipment-rental-provider','مزود معدات / تأجير','Equipment / Rental Provider',100),
  ('real-estate-developer-owner','مطور عقاري / مالك مشروع','Developer / Project Owner',110),
  ('government-semi-government','جهة حكومية / شبه حكومية','Government / Semi-Government',120),
  ('nonprofit-incubator','جمعية / حاضنة / جهة غير ربحية','Nonprofit / Incubator',130),
  ('support-services-provider','مزود خدمات مساندة','Support Services Provider',140),
  ('other-entity','أخرى','Other',999)
) AS x(slug, name_ar, name_en, sort_order)
ON CONFLICT (slug) DO NOTHING;

-- ============== Seed: primary_activity ==============
WITH t AS (SELECT id FROM public.taxonomy_types WHERE code='primary_activity')
INSERT INTO public.taxonomy_categories
  (taxonomy_type_id, slug, name_ar, name_en, sort_order,
   short_description_ar, description_ar, seo_title_ar, seo_description_ar, keywords_ar,
   show_in_registration, show_in_search, show_in_seo, show_in_showcase, is_featured)
SELECT t.id, x.slug, x.name_ar, x.name_en, x.sort_order,
       x.short_desc_ar, x.long_desc_ar, x.seo_t, x.seo_d, x.kw,
       true, true, true, true, true
FROM t, (VALUES
  ('construction-building','تشييد وبناء','Construction & Building',10,
    'جهات ومقاولون لتنفيذ أعمال البناء والبنية التحتية والمشاريع الإنشائية.',
    'يشمل هذا التصنيف الجهات المتخصصة في أعمال التشييد والبناء، البنية التحتية، أعمال العظم، الخرسانة، الطرق، الشبكات، والمشاريع الإنشائية المختلفة.',
    'تشييد وبناء | مقاولون ومزودو خدمات البناء | قطاعات',
    'ابحث عن مزودي خدمات التشييد والبناء والمقاولات وأعمال البنية التحتية واطلب عروض أسعار عبر منصة قطاعات.',
    ARRAY['تشييد','بناء','مقاولات','أعمال بناء','بنية تحتية','أعمال عظم','أعمال خرسانة','مقاولين']),
  ('contracting-finishing','مقاولات وتشطيبات','Contracting & Finishing',20,
    'مقاولون وفرق تنفيذ لأعمال التشطيب الداخلي والخارجي وتجهيز المشاريع.',
    'يشمل هذا التصنيف أعمال التشطيبات، الدهانات، الجبس، الأرضيات، الواجهات، تجهيز المحلات، المكاتب، المطاعم، والمشاريع التجارية.',
    'مقاولات وتشطيبات | اطلب عروض أسعار لمشروعك | قطاعات',
    'ابحث عن مقاولي التشطيبات وتجهيز المحلات والمكاتب والمشاريع واطلب عروض أسعار بطريقة منظمة عبر قطاعات.',
    ARRAY['تشطيبات','مقاول تشطيب','تجهيز محلات','تجهيز مكاتب','دهانات','جبس','أرضيات','ديكور']),
  ('aluminum-glass-facades','ألمنيوم وزجاج وواجهات','Aluminum, Glass & Facades',30,
    'مزودو أعمال الألمنيوم والزجاج والواجهات للمشاريع السكنية والتجارية.',
    'يشمل هذا التصنيف الورش والمصانع ومزودي الخدمة المتخصصين في أعمال الألمنيوم، الزجاج، الواجهات، الأبواب، الشبابيك، القواطع، الكلادينج، والواجهات الزجاجية.',
    'مزودو أعمال الألمنيوم والزجاج والواجهات | قطاعات',
    'ابحث عن مزودي أعمال الألمنيوم والزجاج والواجهات واطلب عروض أسعار للأبواب، الشبابيك، الواجهات، القواطع، والكلادينج عبر قطاعات.',
    ARRAY['ألمنيوم','زجاج','واجهات','أبواب ألمنيوم','شبابيك ألمنيوم','زجاج سيكوريت','كلادينج','كيرتن وول','ورش ألمنيوم']),
  ('steel-metal-works','حديد ومعادن','Steel & Metal Works',40,
    'ورش ومصانع لأعمال الحديد والمعادن والتصنيع المعدني.',
    'يشمل هذا التصنيف أعمال الحديد، الأبواب، الدرابزين، الهياكل المعدنية، اللحام، القص والثني، المظلات، الهناجر، والتصنيع المعدني حسب الطلب.',
    'أعمال الحديد والمعادن | ورش ومصانع حديد | قطاعات',
    'ابحث عن مزودي أعمال الحديد والمعادن والتصنيع المعدني واطلب عروض أسعار للأبواب، الهياكل، الدرابزين، والمظلات عبر قطاعات.',
    ARRAY['حديد','معادن','أبواب حديد','درابزين','هياكل معدنية','ورش حديد','لحام','مظلات','هناجر']),
  ('wood-carpentry','خشب ونجارة','Wood & Carpentry',50,
    'نجارون وورش ومصانع للأثاث، الأبواب، الديكور، والتجهيزات الخشبية.',
    'يشمل هذا التصنيف أعمال النجارة، تفصيل الأثاث، الأبواب الخشبية، الخزائن، الديكورات، المطابخ، وتجهيزات المكاتب والمحلات.',
    'أعمال الخشب والنجارة | تفصيل أثاث وأبواب | قطاعات',
    'ابحث عن مزودي أعمال الخشب والنجارة واطلب عروض أسعار للأبواب، الأثاث، الخزائن، المطابخ، والديكورات عبر قطاعات.',
    ARRAY['خشب','نجارة','أبواب خشب','تفصيل أثاث','خزائن','مطابخ خشب','ديكور خشب','ورشة نجارة']),
  ('stainless-steel-fabrication','ستانلس ستيل وتجهيزات','Stainless Steel & Fabrication',60,
    'مزودو أعمال الستانلس ستيل وتجهيزات المطاعم والمطابخ والمشاريع.',
    'يشمل هذا التصنيف أعمال الستانلس ستيل، تجهيزات المطاعم، المطابخ التجارية، الطاولات، الأحواض، الدرابزين، والتفصيل حسب الطلب.',
    'أعمال الستانلس ستيل وتجهيزات المطاعم | قطاعات',
    'ابحث عن مزودي أعمال الستانلس ستيل للمطاعم والمطابخ والدرابزين والتجهيزات الخاصة واطلب عروض أسعار عبر قطاعات.',
    ARRAY['ستانلس ستيل','تجهيزات مطاعم','مطابخ تجارية','طاولات ستانلس','درابزين ستانلس','أحواض ستانلس']),
  ('building-materials-supply','مواد بناء وتوريد','Building Materials & Supply',70,
    'موردو مواد البناء والتشطيب والكهرباء والسباكة ومستلزمات المشاريع.',
    'يشمل هذا التصنيف توريد مواد البناء مثل الحديد، الإسمنت، العزل، الكهرباء، السباكة، الأخشاب، مواد التشطيب، السيراميك، والرخام.',
    'مواد بناء وتوريد | موردو مواد المشاريع | قطاعات',
    'ابحث عن موردي مواد البناء والتشطيب والحديد والإسمنت والكهرباء والسباكة واطلب عروض أسعار عبر منصة قطاعات.',
    ARRAY['مواد بناء','توريد مواد','حديد','إسمنت','سباكة','كهرباء','مواد تشطيب','عزل','سيراميك','رخام']),
  ('heavy-equipment-rental','معدات ثقيلة وتأجير معدات','Heavy Equipment & Rental',80,
    'مزودو المعدات الثقيلة والخفيفة وخدمات التأجير للمشاريع.',
    'يشمل هذا التصنيف تأجير وتوفير المعدات الثقيلة والخفيفة مثل الرافعات، الشيول، البوكلينات، الكرينات، اللودرات، خلاطات الإسمنت، والكمبروسرات.',
    'تأجير معدات ثقيلة وخفيفة | قطاعات',
    'ابحث عن مزودي تأجير المعدات الثقيلة والخفيفة للمشاريع مثل الرافعات والشيول والبوكلينات والكرينات عبر قطاعات.',
    ARRAY['معدات ثقيلة','تأجير معدات','رافعات','شيول','بوكلين','كرين','لودر','خلاطات إسمنت']),
  ('operations-maintenance','تشغيل وصيانة','Operations & Maintenance',90,
    'شركات تشغيل وصيانة للمباني والمرافق والطرق والمنشآت.',
    'يشمل هذا التصنيف خدمات التشغيل والصيانة للمستشفيات، الفنادق، المساجد، المباني، المصانع، الطرق، الإنارة، الملاعب، والمرافق العامة والخاصة.',
    'تشغيل وصيانة المباني والمرافق | قطاعات',
    'ابحث عن شركات تشغيل وصيانة للمباني والمرافق والطرق والمصانع والمنشآت واطلب عروض أسعار عبر قطاعات.',
    ARRAY['تشغيل وصيانة','صيانة مباني','صيانة مرافق','تشغيل منشآت','صيانة مصانع','صيانة طرق']),
  ('engineering-consulting','مكاتب هندسية واستشارات','Engineering & Consulting',100,
    'مكاتب هندسية واستشارية للتصميم، المخططات، الإشراف، وإدارة المشاريع.',
    'يشمل هذا التصنيف المكاتب الهندسية والاستشارية المتخصصة في المخططات المعمارية والإنشائية، التصميم الداخلي، الإشراف، إدارة المشاريع، والاستشارات الفنية.',
    'مكاتب هندسية واستشارات | تصميم وإشراف | قطاعات',
    'ابحث عن مكاتب هندسية واستشارية للتصميم والإشراف والمخططات وإدارة المشاريع عبر منصة قطاعات.',
    ARRAY['مكتب هندسي','استشارات هندسية','مخططات','تصميم','إشراف','إدارة مشاريع','تصميم داخلي']),
  ('real-estate-development','عقارات وتطوير','Real Estate & Development',110,
    'مطورون وملاك مشاريع عقارية يبحثون عن مزودين أو يعرضون فرصًا ومشاريع.',
    'يشمل هذا التصنيف المطورين العقاريين وملاك المشاريع والمنشآت، المستودعات، الفنادق، المنتجعات، المشاريع السكنية والتجارية، وإدارة الأملاك.',
    'عقارات وتطوير | مطورون وملاك مشاريع | قطاعات',
    'منصة قطاعات تساعد ملاك المشاريع والمطورين العقاريين على الوصول إلى مزودي خدمات التشييد والتجهيز والتوريد.',
    ARRAY['عقارات','تطوير عقاري','مطور عقاري','ملاك مشاريع','مستودعات','فنادق','منتجعات']),
  ('technology-systems','تقنية وتجهيزات','Technology & Systems',120,
    'مزودو الأنظمة التقنية، الشبكات، الكاميرات، السيرفرات، وحلول المباني.',
    'يشمل هذا التصنيف خدمات التقنية للمباني والمنشآت مثل الشبكات، السيرفرات، الكاميرات، الفايبر، البرمجة، نقاط البيع، والحلول التقنية.',
    'تقنية وتجهيزات للمنشآت | كاميرات وشبكات وأنظمة | قطاعات',
    'ابحث عن مزودي الأنظمة التقنية والشبكات والكاميرات والسيرفرات وحلول نقاط البيع للمنشآت عبر قطاعات.',
    ARRAY['تقنية','شبكات','كاميرات','سيرفرات','فايبر','نقاط بيع','برمجة','أنظمة']),
  ('transport-logistics','نقل ولوجستيات','Transport & Logistics',130,
    'خدمات النقل والشحن واللوجستيات للمشاريع والمواد والمعدات.',
    'يشمل هذا التصنيف نقل المواد والمعدات والبضائع، الشاحنات، النقل المبرد، القلابات، وخدمات الدعم اللوجستي للمشاريع.',
    'نقل ولوجستيات للمشاريع | قطاعات',
    'ابحث عن مزودي خدمات النقل واللوجستيات للمشاريع والمواد والمعدات عبر منصة قطاعات.',
    ARRAY['نقل','لوجستيات','شاحنات','نقل مواد','نقل معدات','قلابات','نقل مبرد']),
  ('business-services','خدمات أعمال','Business Services',140,
    'خدمات مساندة للمنشآت مثل المحاسبة، الموارد البشرية، الخدمات القانونية، والتشغيلية.',
    'يشمل هذا التصنيف الخدمات المساندة للمنشآت مثل الخدمات الإدارية، المحاسبية، القانونية، الموارد البشرية، التشغيل، والحاضنات ومسرعات الأعمال.',
    'خدمات أعمال للمنشآت | قطاعات',
    'ابحث عن مزودي خدمات الأعمال المساندة للمنشآت مثل المحاسبة والموارد البشرية والخدمات القانونية والإدارية عبر قطاعات.',
    ARRAY['خدمات أعمال','محاسبة','موارد بشرية','خدمات قانونية','خدمات إدارية','حاضنات أعمال']),
  ('other-activities','أنشطة أخرى','Other Activities',999,
    'تصنيفات أخرى لا تندرج ضمن الأنشطة الرئيسية الحالية.',
    'يستخدم هذا التصنيف للأنشطة التي لا تندرج ضمن التصنيفات الرئيسية في قطاعات، ويمكن مراجعتها وتصنيفها لاحقًا من الإدارة.',
    'أنشطة أخرى | قطاعات',
    'تصنيفات أخرى ضمن منصة قطاعات للأنشطة التي تحتاج مراجعة أو تصنيفًا مخصصًا.',
    ARRAY['أنشطة أخرى','خدمات أخرى','تصنيفات أخرى'])
) AS x(slug, name_ar, name_en, sort_order, short_desc_ar, long_desc_ar, seo_t, seo_d, kw)
ON CONFLICT (slug) DO NOTHING;
