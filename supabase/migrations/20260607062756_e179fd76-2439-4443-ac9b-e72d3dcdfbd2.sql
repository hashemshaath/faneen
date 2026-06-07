-- ---------------------------------------------------------------
-- Showcase: optional taxonomy_category_id (additive, nullable)
-- ---------------------------------------------------------------
ALTER TABLE public.showcase_submissions
  ADD COLUMN IF NOT EXISTS taxonomy_category_id uuid
  REFERENCES public.taxonomy_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_showcase_taxonomy_category
  ON public.showcase_submissions(taxonomy_category_id);

-- ---------------------------------------------------------------
-- Seed taxonomy aliases for major primary activities.
-- Idempotent: insert unique pairs (category_id, lower(alias_ar)).
-- ---------------------------------------------------------------
WITH parents AS (
  SELECT id, slug FROM public.taxonomy_categories
   WHERE slug IN (
     'aluminum-glass-facades','steel-metal-works','wood-carpentry',
     'stainless-steel-fabrication','contracting-finishing','construction-building',
     'building-materials-supply','heavy-equipment-rental','operations-maintenance'
   )
),
seed(parent_slug, alias_ar) AS (VALUES
  -- ألمنيوم وزجاج وواجهات
  ('aluminum-glass-facades','ألمنيوم'),
  ('aluminum-glass-facades','المنيوم'),
  ('aluminum-glass-facades','الومنيوم'),
  ('aluminum-glass-facades','زجاج'),
  ('aluminum-glass-facades','واجهات'),
  ('aluminum-glass-facades','زجاج سيكوريت'),
  ('aluminum-glass-facades','سيكوريت'),
  ('aluminum-glass-facades','كلادينج'),
  ('aluminum-glass-facades','كيرتن وول'),
  -- حديد ومعادن
  ('steel-metal-works','حديد'),
  ('steel-metal-works','معادن'),
  ('steel-metal-works','أعمال معدنية'),
  ('steel-metal-works','ورش حديد'),
  ('steel-metal-works','لحام'),
  ('steel-metal-works','درابزين'),
  ('steel-metal-works','هناجر'),
  -- خشب ونجارة
  ('wood-carpentry','خشب'),
  ('wood-carpentry','نجارة'),
  ('wood-carpentry','نجار'),
  ('wood-carpentry','تفصيل أثاث'),
  ('wood-carpentry','أبواب خشب'),
  ('wood-carpentry','مطابخ خشب'),
  -- ستانلس
  ('stainless-steel-fabrication','ستانلس'),
  ('stainless-steel-fabrication','ستانلس ستيل'),
  ('stainless-steel-fabrication','stainless'),
  ('stainless-steel-fabrication','تجهيزات مطاعم'),
  ('stainless-steel-fabrication','مطابخ تجارية'),
  -- مقاولات وتشطيبات
  ('contracting-finishing','تشطيب'),
  ('contracting-finishing','تشطيبات'),
  ('contracting-finishing','مقاول تشطيب'),
  ('contracting-finishing','ديكور'),
  ('contracting-finishing','جبس'),
  ('contracting-finishing','دهانات'),
  ('contracting-finishing','أرضيات'),
  -- تشييد وبناء
  ('construction-building','بناء'),
  ('construction-building','تشييد'),
  ('construction-building','مقاولات'),
  ('construction-building','خرسانة'),
  ('construction-building','عظم'),
  ('construction-building','بنية تحتية'),
  -- مواد بناء
  ('building-materials-supply','مواد بناء'),
  ('building-materials-supply','توريد مواد'),
  ('building-materials-supply','إسمنت'),
  ('building-materials-supply','حديد تسليح'),
  ('building-materials-supply','سباكة'),
  ('building-materials-supply','كهرباء'),
  -- معدات ثقيلة
  ('heavy-equipment-rental','معدات ثقيلة'),
  ('heavy-equipment-rental','تأجير معدات'),
  ('heavy-equipment-rental','شيول'),
  ('heavy-equipment-rental','بوكلين'),
  ('heavy-equipment-rental','رافعة'),
  ('heavy-equipment-rental','كرين'),
  -- تشغيل وصيانة
  ('operations-maintenance','صيانة'),
  ('operations-maintenance','تشغيل'),
  ('operations-maintenance','صيانة دورية')
)
INSERT INTO public.taxonomy_aliases (category_id, alias_ar, normalized_alias, source)
SELECT p.id, s.alias_ar, lower(trim(s.alias_ar)), 'seed-phase4'
FROM seed s
JOIN parents p ON p.slug = s.parent_slug
WHERE NOT EXISTS (
  SELECT 1 FROM public.taxonomy_aliases a
   WHERE a.category_id = p.id
     AND lower(trim(a.alias_ar)) = lower(trim(s.alias_ar))
);
